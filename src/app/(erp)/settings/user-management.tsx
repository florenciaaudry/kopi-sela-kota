import type { AppRole } from "@/lib/supabase/database.types";
import { roleLabels } from "@/lib/roles";
import { manageUserAction } from "./actions";
import { EditSession } from "../edit-session";
import { EditorToolbar } from "../editor-toolbar";
export type ManagedUser={id:string;full_name:string;email:string;role:AppRole;created_at:string};
function UserFields({user,self}:{user?:ManagedUser;self?:boolean}){
 return <><label className="demo-field"><span>Name</span><input name="full_name" required maxLength={150} defaultValue={user?.full_name??""}/></label>{user?<label className="demo-field"><span>Email</span><input value={user.email} readOnly/></label>:<label className="demo-field"><span>Email</span><input name="email" type="email" required autoComplete="off"/></label>}
 <label className="demo-field"><span>Role</span>{self?<><input type="hidden" name="role" value="owner"/><input readOnly value="Owner"/></>:<select name="role" required defaultValue={user?.role??"sales"}>{(Object.keys(roleLabels)as AppRole[]).map(role=><option value={role} key={role}>{roleLabels[role]}</option>)}</select>}</label>
 {!user?<label className="demo-field"><span>Initial Password</span><input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/><small>Minimal 12 karakter. Bagikan secara pribadi kepada pengguna.</small></label>:null}
 <label className="access-confirm"><input type="checkbox" name="confirm_access" value="yes" required/> Saya sudah memeriksa Role dan mengonfirmasi akses pengguna ini.</label></>;
}
export function UserManagement({users,currentUser,canCreate}:{users:ManagedUser[];currentUser:string;canCreate:boolean}){
 return <section className="section-card"><h2>Manage Users</h2><p className="muted-copy">Perubahan Role berlaku pada pemeriksaan akses berikutnya. Riwayat pelaku transaksi sebelumnya tetap dipertahankan.</p>
 {canCreate?<details className="document-action-form"><summary>New User</summary><EditSession><form action={manageUserAction} className="demo-form user-edit-form" data-unsaved-guard><input type="hidden" name="operation" value="create"/><input type="hidden" name="idempotency_key" value={crypto.randomUUID()}/><EditorToolbar/><UserFields/></form></EditSession></details>:<p className="muted-copy">Pembuatan akun belum diaktifkan oleh administrator. Akses pengguna yang sudah terdaftar tetap dapat diperbarui.</p>}
 {users.map(user=><details key={user.id} className="document-action-form"><summary className="managed-user-summary"><span><strong>{user.full_name}{user.id===currentUser?" (You)":""}</strong><small>{user.email}</small></span><span className="role-pill">{roleLabels[user.role]}</span></summary><EditSession><form action={manageUserAction} className="demo-form user-edit-form" data-unsaved-guard><input type="hidden" name="operation" value="update"/><input type="hidden" name="user_id" value={user.id}/><input type="hidden" name="expected_role" value={user.role}/><input type="hidden" name="expected_name" value={user.full_name}/><input type="hidden" name="idempotency_key" value={crypto.randomUUID()}/><EditorToolbar/><UserFields user={user} self={user.id===currentUser}/></form></EditSession></details>)}</section>;
}
