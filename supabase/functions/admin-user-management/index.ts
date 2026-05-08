import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 시스템 관리자(role=1) 또는 설비 관리자(role=2)만 사용자 관리 가능
    const { data: requesterProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', requestingUser.id)
      .single();

    if (!requesterProfile || requesterProfile.role > 2) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSystemAdmin = requesterProfile.role === 1;

    const { action, userId, authUserId, email, password, userData } = await req.json();

    // 설비 관리자(role=2)는 시스템 관리자(role=1) 부여/대상 작업 불가
    const checkAdminEscalation = async (
      targetUserId?: string,
      targetAuthUserId?: string,
      newRole?: number
    ): Promise<string | null> => {
      if (isSystemAdmin) return null;

      if (newRole === 1) {
        return 'Only system administrators can grant admin role';
      }

      if (targetUserId || targetAuthUserId) {
        const query = supabaseAdmin.from('users').select('role');
        const { data: target } = targetUserId
          ? await query.eq('id', targetUserId).single()
          : await query.eq('auth_user_id', targetAuthUserId!).single();
        if (target?.role === 1) {
          return 'Cannot modify system administrator account';
        }
      }

      return null;
    };

    let result;

    switch (action) {
      case 'create_user': {
        const escalationError = await checkAdminEscalation(undefined, undefined, userData?.role);
        if (escalationError) {
          return new Response(
            JSON.stringify({ error: escalationError }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createAuthError) {
          return new Response(
            JSON.stringify({ error: createAuthError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            ...userData,
            auth_user_id: authData.user?.id,
            email,
            is_active: true,
          })
          .select()
          .single();

        if (profileError) {
          if (authData.user?.id) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          }
          return new Response(
            JSON.stringify({ error: profileError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { user: profileData };
        break;
      }

      case 'update_user': {
        const escalationError = await checkAdminEscalation(userId, undefined, userData?.role);
        if (escalationError) {
          return new Response(
            JSON.stringify({ error: escalationError }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ ...userData, updated_at: new Date().toISOString() })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (password && authUserId) {
          const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            { password }
          );
          if (pwError) {
            return new Response(
              JSON.stringify({ error: pwError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        result = { user: updateData };
        break;
      }

      case 'delete_user': {
        const escalationError = await checkAdminEscalation(userId);
        if (escalationError) {
          return new Response(
            JSON.stringify({ error: escalationError }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: userToDelete } = await supabaseAdmin
          .from('users')
          .select('auth_user_id')
          .eq('id', userId)
          .single();

        const { error: deleteProfileError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId);

        if (deleteProfileError) {
          return new Response(
            JSON.stringify({ error: deleteProfileError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (userToDelete?.auth_user_id) {
          const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
            userToDelete.auth_user_id
          );
          if (deleteAuthError) {
            console.error('Failed to delete auth user:', deleteAuthError);
          }
        }

        result = { success: true };
        break;
      }

      case 'change_password': {
        if (!authUserId || !password) {
          return new Response(
            JSON.stringify({ error: 'authUserId and password required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const escalationError = await checkAdminEscalation(undefined, authUserId);
        if (escalationError) {
          return new Response(
            JSON.stringify({ error: escalationError }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(
          authUserId,
          { password }
        );

        if (pwError) {
          return new Response(
            JSON.stringify({ error: pwError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { success: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
