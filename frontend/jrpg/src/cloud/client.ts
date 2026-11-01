import {createClient} from '@supabase/supabase-js';

// Public browser key only. Supabase JWT + RLS, never this key, identifies an owner.
export const cloudUrl='https://vhadyzqucouowxsyyoui.supabase.co';
export const cloudKey='sb_publishable_fe4WyR1Bwhg_jv6Mz1Vd2A_x2YzUmrV';
let client:ReturnType<typeof createClient>|undefined;
export function cloudClient(){
 return client??=createClient(cloudUrl,cloudKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
}
