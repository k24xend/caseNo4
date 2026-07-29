import { describe,expect,it } from 'vitest'; import { normalizeSettings } from './db';
describe('settings migration',()=>{it('normalizes legacy values',()=>{const v=normalizeSettings({theme:'dark',language:'en',demoOffline:false,demoError:false,scenario:'normal',entered:true});expect(v.version).toBe(2);expect(v.resources?.phone).toBe(true);expect(v.theme).toBe('dark')})});
