import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import ConfirmEmail from '@/emails/ConfirmEmail';
import ResetPasswordEmail from '@/emails/ResetPasswordEmail';

/**
 * POST /api/auth/send-email
 *
 * Supabase "Send Email" Auth Hook endpoint.
 *
 * Configure in Supabase Dashboard →
 *   Authentication → Hooks → Send Email Hook
 *   URL: https://your-app.vercel.app/api/auth/send-email
 *   (optionally set a signing secret and add it as SUPABASE_AUTH_HOOK_SECRET)
 *
 * Required env vars:
 *   RESEND_API_KEY          — from resend.com
 *   EMAIL_FROM              — e.g. "Campaign Compendium <noreply@yourdomain.com>"
 *   NEXT_PUBLIC_SITE_URL    — e.g. "https://campaign-compendium.vercel.app"
 *
 * Optional env vars:
 *   SUPABASE_AUTH_HOOK_SECRET — JWT secret set in Supabase Hook config
 */

interface HookPayload {
  user: {
    id:             string;
    email:          string;
    user_metadata?: { display_name?: string };
  };
  email_data: {
    token:             string;
    token_hash:        string;
    redirect_to:       string;
    email_action_type: 'signup' | 'recovery' | 'invite' | 'email_change_new' | 'email_change_current';
    site_url:          string;   // Supabase project URL
    token_new?:        string;
    token_hash_new?:   string;
  };
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  // -- Optional: verify the Supabase hook JWT secret --
  const hookSecret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (hookSecret) {
    const auth = request.headers.get('authorization') ?? '';
    // Supabase sends: Authorization: Bearer <jwt>
    // A full JWT verification library isn't required here — Supabase signs with
    // HMAC-SHA256 and the secret. For simplicity we check the raw bearer token.
    // For production hardening, verify with jose or jsonwebtoken.
    if (!auth.startsWith('Bearer ') || auth.slice(7) !== hookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let payload: HookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { user, email_data } = payload;
  const { email_action_type, token_hash, redirect_to, site_url } = email_data;
  const displayName = user.user_metadata?.display_name ?? undefined;
  const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? site_url;
  const fromAddress = process.env.EMAIL_FROM ?? 'Campaign Compendium <noreply@campaigncompendium.app>';

  // Build the Supabase verification URL
  const verifyUrl = (type: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${type}&redirect_to=${encodeURIComponent(redirect_to || siteUrl)}`;

  try {
    switch (email_action_type) {
      case 'signup': {
        const html = await render(ConfirmEmail({ displayName, confirmUrl: verifyUrl('signup') }));
        await resend.emails.send({
          from:    fromAddress,
          to:      user.email,
          subject: 'Confirm your Campaign Compendium account',
          html,
        });
        break;
      }

      case 'recovery': {
        const html = await render(ResetPasswordEmail({ displayName, resetUrl: verifyUrl('recovery') }));
        await resend.emails.send({
          from:    fromAddress,
          to:      user.email,
          subject: 'Reset your Campaign Compendium password',
          html,
        });
        break;
      }

      case 'invite': {
        // Invitations reuse the confirmation template — the token type is 'invite'
        const html = await render(ConfirmEmail({ displayName, confirmUrl: verifyUrl('invite') }));
        await resend.emails.send({
          from:    fromAddress,
          to:      user.email,
          subject: "You've been invited to Campaign Compendium",
          html,
        });
        break;
      }

      case 'email_change_new':
      case 'email_change_current': {
        const html = await render(ConfirmEmail({ displayName, confirmUrl: verifyUrl(email_action_type) }));
        await resend.emails.send({
          from:    fromAddress,
          to:      user.email,
          subject: 'Confirm your new email address',
          html,
        });
        break;
      }

      default:
        // Unknown type — return 200 to prevent Supabase from retrying
        console.warn('[send-email] Unhandled email_action_type:', email_action_type);
    }
  } catch (err) {
    console.error('[send-email] Failed to send email:', err);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }

  // Supabase expects a 200 response to confirm the hook succeeded
  return NextResponse.json({ ok: true });
}
