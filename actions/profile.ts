'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface UpdateProfileInput {
  display_name?: string
  sound_enabled?: boolean
  sound_volume?: number
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated — please sign in again' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(input as never)
    .eq('id', user.id)

  if (error) {
    console.error('Profile update error:', error)
    return { error: error.message }
  }

  revalidatePath('/settings')
  return { success: true }
}
