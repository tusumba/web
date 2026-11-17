import { describe, expect, it } from 'vitest';
import { accessRoles } from '../auth/accessRoles';
function token(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload);
  const encoded = btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return `eyJhbGciOiJSUzI1NiJ9.${encoded}.signature`;
}
describe('Moderation role presentation check',()=>{
  it('открывает интерфейс для moderator',()=>expect(accessRoles(token({roles:['user','moderator']}))).toContain('moderator'));
  it('не принимает обычную роль',()=>expect(accessRoles(token({roles:['user']}))).not.toContain('moderator'));
  it('закрывает интерфейс на повреждённом токене',()=>expect(accessRoles('not-a-jwt')).toEqual([]));
  it('не принимает строку вместо списка ролей',()=>expect(accessRoles(token({roles:'moderator'}))).toEqual([]));
});
