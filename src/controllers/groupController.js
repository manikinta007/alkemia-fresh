// controllers/groupController.js
import { jsonResponse } from '../utils.js';

export async function handleGroupRequest(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    try {
        // ========================================
        // 1. CREATE GROUP SET (Save Generated Groups)
        // ========================================
        if (pathname === "/api/groups/sets" && method === "POST") {
            const body = await request.json();
            const { classId, name, groups } = body;
            // groups: [{ name: "Kelompok 1", memberIds: [1, 2, 3] }, ...]

            if (!classId || !name || !groups || !Array.isArray(groups)) {
                return jsonResponse({ error: "Invalid data format" }, 400);
            }

            // 1. Create Group Set
            const setInfo = await env.DB.prepare("INSERT INTO group_sets (class_id, name) VALUES (?, ?)").bind(classId, name).run();
            const setId = setInfo.meta.last_row_id;

            // 2. Insert Groups and Members
            // Note: We do this sequentially to ensure we get IDs. 
            // For production with high traffic, batching strategies or transactions needed.

            for (const group of groups) {
                const groupInfo = await env.DB.prepare("INSERT INTO groups (set_id, name) VALUES (?, ?)").bind(setId, group.name).run();
                const groupId = groupInfo.meta.last_row_id;

                if (group.memberIds && group.memberIds.length > 0) {
                    const memberStmts = group.memberIds.map(studentId =>
                        env.DB.prepare("INSERT INTO group_members (group_id, student_id) VALUES (?, ?)").bind(groupId, studentId)
                    );
                    await env.DB.batch(memberStmts);
                }
            }

            return jsonResponse({ message: "Kelompok berhasil disimpan", id: setId });
        }

        // ========================================
        // 2. LIST GROUP SETS (By Class)
        // ========================================
        if (pathname === "/api/groups/sets" && method === "GET") {
            const classId = url.searchParams.get("class_id");
            if (!classId) return jsonResponse({ error: "class_id required" }, 400);

            const { results } = await env.DB.prepare(`
                SELECT id, name, created_at,
                (SELECT COUNT(*) FROM groups WHERE set_id = group_sets.id) as group_count
                FROM group_sets 
                WHERE class_id = ? 
                ORDER BY created_at DESC
            `).bind(classId).all();

            return jsonResponse(results);
        }

        // ========================================
        // 3. GET GROUP SET DETAILS
        // ========================================
        if (pathname.startsWith("/api/groups/sets/") && method === "GET") {
            // Path: /api/groups/sets/123
            const id = pathname.split("/").pop(); // Simple extraction

            // 1. Get Set Info
            const setInfo = await env.DB.prepare("SELECT * FROM group_sets WHERE id = ?").bind(id).first();
            if (!setInfo) return jsonResponse({ error: "Set not found" }, 404);

            // 2. Get Groups
            const { results: groups } = await env.DB.prepare("SELECT id, name FROM groups WHERE set_id = ?").bind(id).all();

            // 3. Get Members for all groups
            // Optimization: Fetch all members for this set in one query
            const { results: members } = await env.DB.prepare(`
                SELECT gm.group_id, s.id, s.name 
                FROM group_members gm
                JOIN students s ON gm.student_id = s.id
                WHERE gm.group_id IN (SELECT id FROM groups WHERE set_id = ?)
            `).bind(id).all();

            // 4. Map members to groups
            const membersMap = {};
            members.forEach(m => {
                if (!membersMap[m.group_id]) membersMap[m.group_id] = [];
                membersMap[m.group_id].push({ id: m.id, name: m.name });
            });

            const groupsWithMembers = groups.map(g => ({
                ...g,
                members: membersMap[g.id] || []
            }));

            return jsonResponse({
                ...setInfo,
                groups: groupsWithMembers
            });
        }

        // ========================================
        // 4. DELETE GROUP SET
        // ========================================
        if (pathname.startsWith("/api/groups/sets/") && method === "DELETE") {
            const id = pathname.split("/").pop();

            // Check if set exists
            const exists = await env.DB.prepare("SELECT id FROM group_sets WHERE id = ?").bind(id).first();
            if (!exists) return jsonResponse({ error: "Set not found" }, 404);

            // Delete (Cascade handled by DB)
            // But D1 support for FK constraints needs to be enabled/verified. 
            // To be safe, manual delete:

            const { results: groups } = await env.DB.prepare("SELECT id FROM groups WHERE set_id = ?").bind(id).all();
            const groupIds = groups.map(g => g.id);

            if (groupIds.length > 0) {
                // Delete members
                // Can't do "WHERE group_id IN (...)" easily with binding array, loop or batch
                // Or just use batch delete
                const deleteMembers = groupIds.map(gid => env.DB.prepare("DELETE FROM group_members WHERE group_id = ?").bind(gid));
                await env.DB.batch(deleteMembers);

                // Delete groups
                await env.DB.prepare("DELETE FROM groups WHERE set_id = ?").bind(id).run();
            }

            // Delete set
            await env.DB.prepare("DELETE FROM group_sets WHERE id = ?").bind(id).run();

            return jsonResponse({ message: "Group set deleted" });
        }

        // ========================================
        // 5. SET GROUP LEADER (Any Member Can Set if NULL, or Override?)
        // ========================================
        if (pathname.match(/^\/api\/groups\/\d+\/leader$/) && method === "POST") {
            const groupId = pathname.split("/")[3];
            const { studentId } = await request.json(); // The new leader ID

            // 1. Authenticate Requesting Student
            const authHeader = request.headers.get("Authorization");
            if (!authHeader || !authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
            const token = authHeader.split(" ")[1];
            const session = await env.DB.prepare("SELECT * FROM student_sessions WHERE device_token = ? AND is_active = 1").bind(token).first();

            if (!session) return jsonResponse({ error: "Unauthorized session" }, 401);
            const requestorId = session.student_id;

            // 2. Validate Membership
            // Check if both requestor and target leader are in the group
            const membership = await env.DB.prepare(`
                SELECT student_id 
                FROM group_members 
                WHERE group_id = ? AND student_id IN (?, ?)
            `).bind(groupId, requestorId, studentId).all();

            // Must find both IDs (or 1 if self-appointing) in the group
            const memberIds = membership.results.map(m => m.student_id);
            if (!memberIds.includes(requestorId)) return jsonResponse({ error: "You are not in this group" }, 403);
            if (!memberIds.includes(studentId)) return jsonResponse({ error: "Target leader is not in this group" }, 400);

            // 3. Get Requestor Name for Audit
            const requestor = await env.DB.prepare("SELECT name FROM students WHERE id = ?").bind(requestorId).first();

            // 4. Update Group
            const auditLog = JSON.stringify({
                by_id: requestorId,
                by_name: requestor.name,
                at: new Date().toISOString()
            });

            await env.DB.prepare(`
                UPDATE groups 
                SET leader_id = ?, leader_selected_by = ? 
                WHERE id = ?
            `).bind(studentId, auditLog, groupId).run();

            return jsonResponse({ message: "Ketua berhasil dipilih" });
        }

        return null; // Not handled
    } catch (e) {
        return jsonResponse({ error: "Group Controller Error: " + e.message, stack: e.stack }, 500);
    }
}
