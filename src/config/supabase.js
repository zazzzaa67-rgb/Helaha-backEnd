import "dotenv/config";
import {createClient} from '@supabase/supabase-js'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey= process.env.SUPABASE_SECRET_KEY
if(!supabaseUrl || !supabaseKey){
    throw new Error('Supabase environment variables are missing')
}
export const supabase = createClient(supabaseUrl  , supabaseKey)
console.log(
    "SUPABASE SECRET KEY EXISTS:",
    !!process.env.SUPABASE_SECRET_KEY
)