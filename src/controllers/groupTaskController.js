import { jsonResponse } from "../utils.js";

export async function handleGroupTaskRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // --- TEACHER ENDPOINTS ---

    // 1. GET ALL GROUP TASKS (Aggregator helper)
    if (pathname === "/api/group-tasks" && method === "GET") {
        const classId = url.searchParams.get("classId");
        if (!classId) return jsonResponse({ error: "Class ID required" }, 400);

        // Fetch tasks
        const { results } = await env.DB.prepare(`
            SELECT 
                gt.*, 
                gs.name as group_set_name,
                (SELECT COUNT(*) FROM group_task_submissions WHERE group_task_id = gt.id AND is_graded = 1) as graded_count,
                (SELECT COUNT(*) FROM group_tasks WHERE id = gt.id) as total_count 
            FROM group_tasks gt
            JOIN group_sets gs ON gt.group_set_id = gs.id
            WHERE gt.class_id = ?
            ORDER BY gt.created_at DESC
        `).bind(classId).all();

        return jsonResponse(results);
    }

    // 2. CREATE GROUP TASK
    if (pathname === "/api/group-tasks" && method === "POST") {
        try {
            const body = await request.json();
            const {
                period_id, class_id, group_set_id,
                title, description, deadline,
                questions // Array of { type, text, image, options, correct_key, weight }
            } = body;

            // Validation
            if (!class_id || !group_set_id || !title) {
                return jsonResponse({ error: "Missing required fields" }, 400);
            }

            // Insert Task
            const taskRes = await env.DB.prepare(`
                INSERT INTO group_tasks (period_id, class_id, group_set_id, title, description, deadline, is_active)
                VALUES (?, ?, ?, ?, ?, ?, 0)
            `).bind(period_id, class_id, group_set_id, title, description, deadline).run();

            const taskId = taskRes.meta.last_row_id;

            // Insert Questions (Mode: Same for all)
            if (questions && questions.length > 0) {
                const stmt = env.DB.prepare(`
                    INSERT INTO group_task_questions (group_task_id, type, question_text, question_image_url, options, correct_key, weight)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                await env.DB.batch(questions.map(q => stmt.bind(
                    taskId,
                    q.type,
                    q.text || '',
                    q.image || null,
                    q.options ? JSON.stringify(q.options) : null,
                    q.correct_key || null,
                    q.weight || 0
                )));
            }

            return jsonResponse({ message: "Group Task created", id: taskId });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    // 3. GET TASK DETAIL (For Editing/Viewing) — only match /api/group-tasks/{numeric_id}
    if (method === "GET" && pathname.startsWith("/api/group-tasks/")) {
        const lastSegment = pathname.split("/").pop();
        // Only match numeric IDs, skip named sub-routes like /submissions, /submission-detail, etc.
        if (/^\d+$/.test(lastSegment)) {
            const taskId = lastSegment;

            const task = await env.DB.prepare("SELECT * FROM group_tasks WHERE id = ?").bind(taskId).first();
            if (!task) return jsonResponse({ error: "Task not found" }, 404);

            const { results: questions } = await env.DB.prepare("SELECT * FROM group_task_questions WHERE group_task_id = ?").bind(taskId).all();

            return jsonResponse({ ...task, questions });
        }
    }

    // 4. SUBMISSIONS LIST (For Grading)
    if (pathname === "/api/group-tasks/submissions" && method === "GET") {
        const taskId = url.searchParams.get("taskId");

        // Get all groups in the set
        const task = await env.DB.prepare("SELECT group_set_id FROM group_tasks WHERE id = ?").bind(taskId).first();
        if (!task) return jsonResponse({ error: "Task not found" }, 404);

        const { results: groups } = await env.DB.prepare("SELECT id, name FROM groups WHERE set_id = ?").bind(task.group_set_id).all();

        // Get submissions
        const { results: submissions } = await env.DB.prepare(`
            SELECT s.*, st.name as submitter_name 
            FROM group_task_submissions s
            LEFT JOIN students st ON s.submitted_by = st.id
            WHERE s.group_task_id = ?
        `).bind(taskId).all();

        // Fetch all members for all groups in one query (avoid N+1)
        const groupIds = groups.map(g => g.id);
        let membersMap = {};
        if (groupIds.length > 0) {
            const { results: allMembers } = await env.DB.prepare(`
                SELECT gm.group_id, s.id, s.name
                FROM group_members gm
                JOIN students s ON gm.student_id = s.id
                WHERE gm.group_id IN (${groupIds.map(() => '?').join(',')})
            `).bind(...groupIds).all();

            allMembers.forEach(m => {
                if (!membersMap[m.group_id]) membersMap[m.group_id] = [];
                membersMap[m.group_id].push({ id: m.id, name: m.name });
            });
        }

        // Merge logic: Show all groups, attach submission + members
        const data = groups.map(g => {
            const sub = submissions.find(s => s.group_id === g.id);
            return {
                group_id: g.id,
                group_name: g.name,
                members: membersMap[g.id] || [],
                submission: sub || null,
                status: sub ? (sub.is_graded ? 'DINILAI' : 'MENUNGGU_NILAI') : 'BELUM_DIKERJAKAN'
            };
        });

        return jsonResponse(data);
    }

    // 5. SUBMISSION DETAIL (For Grading View)
    if (pathname === "/api/group-tasks/submission-detail" && method === "GET") {
        const submissionId = url.searchParams.get("submissionId");

        const submission = await env.DB.prepare(`
            SELECT s.*, g.name as group_name, st.name as submitter_name
            FROM group_task_submissions s
            JOIN groups g ON s.group_id = g.id
            JOIN students st ON s.submitted_by = st.id
            WHERE s.id = ?
        `).bind(submissionId).first();

        if (!submission) return jsonResponse({ error: "Submission not found" }, 404);

        const { results: answers } = await env.DB.prepare(`
            SELECT a.id as answer_id, a.submission_id, a.question_id, a.answer_text, a.answer_image_url, a.score, a.is_graded,
                   q.question_text, q.type, q.weight, q.options, q.question_image_url, q.correct_key
            FROM group_task_answers a
            JOIN group_task_questions q ON a.question_id = q.id
            WHERE a.submission_id = ?
        `).bind(submissionId).all();

        return jsonResponse({ submission, answers });
    }

    // 6. SAVE GRADE (Enhanced with essay answer-level scores)
    if (pathname === "/api/group-tasks/grade" && method === "POST") {
        try {
            const { submissionId, grade, feedback, essayScores } = await request.json();

            await env.DB.prepare(`
                UPDATE group_task_submissions 
                SET grade = ?, feedback = ?, is_graded = 1 
                WHERE id = ?
            `).bind(grade, feedback || '', submissionId).run();

            // Save individual essay answer scores
            if (essayScores && Object.keys(essayScores).length > 0) {
                const stmts = Object.entries(essayScores).map(([answerId, score]) =>
                    env.DB.prepare(`
                        UPDATE group_task_answers SET score = ?, is_graded = 1 WHERE id = ?
                    `).bind(score, answerId)
                );
                await env.DB.batch(stmts);
            }

            return jsonResponse({ message: "Grade saved" });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    // 7. PUBLISH GRADES
    if (pathname === "/api/group-tasks/publish" && method === "POST") {
        const { taskId, isPublished } = await request.json();

        await env.DB.prepare(`
            UPDATE group_tasks SET grades_published = ? WHERE id = ?
        `).bind(isPublished ? 1 : 0, taskId).run();

        // Also update submissions visibility
        await env.DB.prepare(`
            UPDATE group_task_submissions SET is_published = ? WHERE group_task_id = ?
        `).bind(isPublished ? 1 : 0, taskId).run();

        return jsonResponse({ message: "Grades published status updated" });
    }

    // 8. UPDATE TASK (Full save - questions + identity)
    if (pathname === "/api/group-tasks/update" && method === "PUT") {
        try {
            const body = await request.json();
            const { id, title, description, deadline, group_set_id, pg_weight, questions } = body;

            if (!id) return jsonResponse({ error: "Task ID required" }, 400);

            // Update task header
            await env.DB.prepare(`
                UPDATE group_tasks 
                SET title = ?, description = ?, deadline = ?, group_set_id = ?, pg_weight = ?
                WHERE id = ?
            `).bind(title, description || '', deadline || null, group_set_id, pg_weight || 0, id).run();

            // Delete answers first (FK constraint: answers reference questions without CASCADE)
            await env.DB.prepare("DELETE FROM group_task_answers WHERE question_id IN (SELECT id FROM group_task_questions WHERE group_task_id = ?)").bind(id).run();
            // Then delete old questions and re-insert
            await env.DB.prepare("DELETE FROM group_task_questions WHERE group_task_id = ?").bind(id).run();

            if (questions && questions.length > 0) {
                const stmt = env.DB.prepare(`
                    INSERT INTO group_task_questions (group_task_id, type, question_text, question_image_url, options, correct_key, weight)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                await env.DB.batch(questions.map(q => stmt.bind(
                    id,
                    q.type,
                    q.text || '',
                    q.image || null,
                    q.options ? JSON.stringify(q.options) : null,
                    q.correct_key || null,
                    q.weight || 0
                )));
            }

            return jsonResponse({ message: "Tugas kelompok berhasil diperbarui" });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    // 8b. UPDATE WEIGHTS ONLY (Safe — no delete/re-insert)
    if (pathname === "/api/group-tasks/update-weights" && method === "PUT") {
        try {
            const body = await request.json();
            const { id, pg_weight, questions } = body;

            if (!id) return jsonResponse({ error: "Task ID required" }, 400);

            // Update pg_weight on task
            await env.DB.prepare(`UPDATE group_tasks SET pg_weight = ? WHERE id = ?`).bind(pg_weight || 0, id).run();

            // Update each question's weight in-place
            if (questions && questions.length > 0) {
                const stmts = questions.filter(q => q.id).map(q =>
                    env.DB.prepare(`UPDATE group_task_questions SET weight = ? WHERE id = ?`).bind(q.weight || 0, q.id)
                );
                if (stmts.length > 0) await env.DB.batch(stmts);
            }

            return jsonResponse({ message: "Bobot berhasil disimpan" });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    // 9. TOGGLE STATUS (Publish/Draft)
    if (pathname === "/api/group-tasks/toggle" && method === "POST") {
        try {
            const { id, isActive } = await request.json();
            await env.DB.prepare(`
                UPDATE group_tasks SET is_active = ? WHERE id = ?
            `).bind(isActive, id).run();
            return jsonResponse({ message: "Status updated" });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    // 10. DELETE TASK
    if (pathname === "/api/group-tasks/delete" && method === "DELETE") {
        try {
            const url2 = new URL(request.url);
            const id = url2.searchParams.get("id");
            if (!id) return jsonResponse({ error: "Task ID required" }, 400);

            // Delete answers first (cascade)
            const { results: subs } = await env.DB.prepare(
                "SELECT id FROM group_task_submissions WHERE group_task_id = ?"
            ).bind(id).all();

            if (subs.length > 0) {
                const subIds = subs.map(s => s.id);
                for (const subId of subIds) {
                    await env.DB.prepare("DELETE FROM group_task_answers WHERE submission_id = ?").bind(subId).run();
                }
            }

            await env.DB.prepare("DELETE FROM group_task_submissions WHERE group_task_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM group_task_questions WHERE group_task_id = ?").bind(id).run();
            await env.DB.prepare("DELETE FROM group_tasks WHERE id = ?").bind(id).run();

            return jsonResponse({ message: "Tugas kelompok berhasil dihapus" });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    // 11. SAVE DISCUSSION (Kunci & Pembahasan)
    if (pathname === "/api/group-tasks/discussion" && method === "POST") {
        try {
            const { taskId, discussionText, discussionUrl, showDiscussion } = await request.json();
            await env.DB.prepare(`
                UPDATE group_tasks 
                SET discussion_text = ?, discussion_url = ?, show_discussion = ?
                WHERE id = ?
            `).bind(
                discussionText || '',
                discussionUrl || '',
                showDiscussion ? 1 : 0,
                taskId
            ).run();
            return jsonResponse({ message: "Pengaturan pembahasan tersimpan" });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    // --- STUDENT ENDPOINTS ---

    // HELPER: Authenticate Student
    async function getStudentSession(req, env) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
        const token = authHeader.split(" ")[1];
        const session = await env.DB.prepare("SELECT student_id FROM student_sessions WHERE device_token = ? AND is_active = 1").bind(token).first();
        return session ? session.student_id : null;
    }

    // 1. GET STUDENT TASKS (Aggregator)
    if (pathname === "/api/student/group-tasks" && method === "GET") {
        const studentId = await getStudentSession(request, env);
        if (!studentId) return jsonResponse({ error: "Unauthorized" }, 401);

        // Find which groups this student belongs to
        const { results: myGroups } = await env.DB.prepare("SELECT group_id FROM group_members WHERE student_id = ?").bind(studentId).all();
        const groupIds = myGroups.map(g => g.group_id);

        if (groupIds.length === 0) return jsonResponse([]);

        // Find tasks assigned to those groups' sets
        // We need to join groups -> group_sets -> group_tasks
        // AND check if a submission exists for MY group
        const { results: tasks } = await env.DB.prepare(`
            SELECT 
                gt.id, gt.title, gt.deadline, gt.created_at, gt.grades_published,
                gs.name as group_set_name,
                g.id as my_group_id, g.name as my_group_name,
                s.id as submission_id, s.is_graded, s.grade, s.submitted_by
            FROM group_tasks gt
            JOIN group_sets gs ON gt.group_set_id = gs.id
            JOIN groups g ON g.set_id = gs.id
            LEFT JOIN group_task_submissions s ON s.group_task_id = gt.id AND s.group_id = g.id
            WHERE g.id IN (${groupIds.join(',')}) AND gt.is_active = 1
            ORDER BY gt.created_at DESC
        `).all();

        return jsonResponse(tasks);
    }

    // 2. GET TASK DETAIL & MY SUBMISSION
    if (pathname === "/api/student/group-task-detail" && method === "GET") {
        const taskId = url.searchParams.get("taskId");
        const studentId = await getStudentSession(request, env);
        if (!studentId) return jsonResponse({ error: "Unauthorized" }, 401);

        const task = await env.DB.prepare("SELECT * FROM group_tasks WHERE id = ?").bind(taskId).first();
        if (!task) return jsonResponse({ error: "Task not found" }, 404);

        // Get questions
        const { results: questions } = await env.DB.prepare("SELECT * FROM group_task_questions WHERE group_task_id = ?").bind(taskId).all();

        // Get my group info
        // ADDED: leader_id, leader_selected_by
        const myGroup = await env.DB.prepare(`
            SELECT g.id, g.name, g.leader_id, g.leader_selected_by 
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE g.set_id = ? AND gm.student_id = ?
        `).bind(task.group_set_id, studentId).first();

        if (!myGroup) return jsonResponse({ error: "Student not in any group for this task" }, 403);

        // Get group members
        const { results: members } = await env.DB.prepare(`
            SELECT s.id, s.name FROM students s
            JOIN group_members gm ON s.id = gm.student_id
            WHERE gm.group_id = ?
        `).bind(myGroup.id).all();

        // Get existing submission (if any)
        const submission = await env.DB.prepare(`
            SELECT * FROM group_task_submissions WHERE group_task_id = ? AND group_id = ?
        `).bind(taskId, myGroup.id).first();

        let answers = [];
        let activityLogs = [];
        if (submission) {
            const res = await env.DB.prepare("SELECT * FROM group_task_answers WHERE submission_id = ?").bind(submission.id).all();
            answers = res.results;

            // Fetch activity logs
            try {
                const logRes = await env.DB.prepare(`
                    SELECT l.*, s.name as student_name
                    FROM group_task_activity_log l
                    LEFT JOIN students s ON l.student_id = s.id
                    WHERE l.submission_id = ?
                    ORDER BY l.created_at DESC
                    LIMIT 50
                `).bind(submission.id).all();
                activityLogs = logRes.results;
            } catch (e) {
                // Table might not exist yet, ignore
            }
        }

        return jsonResponse({
            task,
            questions,
            group: { ...myGroup, members },
            currentStudentId: studentId,
            submission,
            answers,
            activityLogs
        });
    }

    // 3. SUBMIT TASK (Draft or Final)
    if (pathname === "/api/student/group-tasks/submit" && method === "POST") {
        const studentId = await getStudentSession(request, env);
        if (!studentId) return jsonResponse({ error: "Unauthorized" }, 401);

        try {
            const { taskId, responses, isDraft } = await request.json(); // responses: { qId: { text, image, option } }

            // Validate student group
            const task = await env.DB.prepare("SELECT group_set_id FROM group_tasks WHERE id = ?").bind(taskId).first();
            const myGroup = await env.DB.prepare(`
                SELECT g.id, g.leader_id FROM groups g
                JOIN group_members gm ON g.id = gm.group_id
                WHERE g.set_id = ? AND gm.student_id = ?
            `).bind(task.group_set_id, studentId).first();

            if (!myGroup) return jsonResponse({ error: "No group found" }, 403);

            // LEADER CHECK: Only allow final submission if User IS Leader
            if (!isDraft) {
                if (!myGroup.leader_id) return jsonResponse({ error: "Kelompok belum memiliki ketua. Pilih ketua terlebih dahulu." }, 403);
                if (myGroup.leader_id !== studentId) return jsonResponse({ error: "Hanya ketua kelompok yang dapat mengirim tugas." }, 403);
            }

            // Create or Update Submission header
            let submission = await env.DB.prepare(`
                SELECT id, is_graded FROM group_task_submissions WHERE group_task_id = ? AND group_id = ?
            `).bind(taskId, myGroup.id).first();

            // Prevent overwrite if already graded or submitted (unless draft or specific logic)
            if (submission && submission.is_graded === 1) {
                return jsonResponse({ error: "Tugas sudah dinilai, tidak bisa diubah." }, 403);
            }
            if (submission && submission.is_graded === 0 && !isDraft) {
                // Trying to submit again? Maybe allow if deadline logic permits. 
                // For now allow re-submit if not graded.
            }

            let submissionId;
            if (submission) {
                // Update existing
                if (isDraft) {
                    // Draft: DON'T set submitted_at so it's not treated as submitted
                    await env.DB.prepare(`
                        UPDATE group_task_submissions 
                        SET submitted_by = ?, is_graded = -1
                        WHERE id = ?
                    `).bind(studentId, submission.id).run();
                } else {
                    // Final submit: set submitted_at
                    await env.DB.prepare(`
                        UPDATE group_task_submissions 
                        SET submitted_by = ?, is_graded = 0, submitted_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).bind(studentId, submission.id).run();
                }
                submissionId = submission.id;
            } else {
                // Create new
                if (isDraft) {
                    // Draft: don't set submitted_at (leave NULL)
                    const res = await env.DB.prepare(`
                        INSERT INTO group_task_submissions (group_task_id, group_id, submitted_by, is_graded, submitted_at)
                        VALUES (?, ?, ?, -1, NULL)
                    `).bind(taskId, myGroup.id, studentId).run();
                    submissionId = res.meta.last_row_id;
                } else {
                    // Final submit
                    const res = await env.DB.prepare(`
                        INSERT INTO group_task_submissions (group_task_id, group_id, submitted_by, is_graded)
                        VALUES (?, ?, ?, 0)
                    `).bind(taskId, myGroup.id, studentId).run();
                    submissionId = res.meta.last_row_id;
                }
            }

            // Save Answers
            // Strategy: Delete old answers for this submission and insert new ones (simpler than upsert)
            // Note: In a high volume system, upsert is better. Here, delete/insert is fine.
            await env.DB.prepare("DELETE FROM group_task_answers WHERE submission_id = ?").bind(submissionId).run();

            const answerStmt = env.DB.prepare(`
                INSERT INTO group_task_answers (submission_id, question_id, answer_text, answer_image_url)
                VALUES (?, ?, ?, ?)
            `);

            const insertPromises = Object.entries(responses).map(([qId, innerVal]) => {
                // innerVal is { text, image, option, answerImages }. We need to map it correctly.
                let text = innerVal.text || innerVal.option || (typeof innerVal === 'string' ? innerVal : null);
                // Support multi-image: if answerImages array exists with multiple items, store as JSON array
                let image = null;
                if (innerVal.answerImages && Array.isArray(innerVal.answerImages) && innerVal.answerImages.length > 0) {
                    image = innerVal.answerImages.length === 1 ? innerVal.answerImages[0] : JSON.stringify(innerVal.answerImages);
                } else {
                    image = innerVal.image || null;
                }
                return answerStmt.bind(submissionId, qId, text, image);
            });

            await env.DB.batch(insertPromises);

            // Log activity
            try {
                const questionIds = Object.keys(responses);
                const action = isDraft ? 'draft_save' : 'final_submit';
                const detail = isDraft
                    ? `Menyimpan draft untuk ${questionIds.length} soal`
                    : `Mengirim jawaban final untuk ${questionIds.length} soal`;
                await env.DB.prepare(`
                    INSERT INTO group_task_activity_log (submission_id, student_id, action, detail)
                    VALUES (?, ?, ?, ?)
                `).bind(submissionId, studentId, action, detail).run();
            } catch (logErr) {
                // Don't fail the whole request if logging fails (table might not exist)
                console.error('Activity log error:', logErr);
            }

            return jsonResponse({ message: isDraft ? "Draft tersimpan" : "Tugas berhasil dikirim" });
        } catch (e) {
            return jsonResponse({ error: e.message }, 500);
        }
    }

    return null;
}
