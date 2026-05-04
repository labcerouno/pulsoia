'use server'

import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

// Lista de emails autorizados para acceder al backoffice
const ALLOWED_ADMIN_EMAILS = [
  'eldersoares@gmail.com',
  'ia@oxy46.com',
  // Agrega más emails según necesites
]

function generateOTP(): string {
  // Generate 6-digit OTP
  return crypto.randomInt(100000, 999999).toString()
}

export async function requestOTP(email: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim()

    // Verify email is in allowed list
    if (!ALLOWED_ADMIN_EMAILS.includes(normalizedEmail)) {
      return { success: false, message: 'Email no autorizado' }
    }

    const supabase = createServerClient()

    // Get or create admin user
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id, name')
      .eq('email', normalizedEmail)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('User lookup error:', userError)
      console.error('Error details:', { code: userError.code, message: userError.message })
      return { success: false, message: `Error al buscar usuario: ${userError.message}` }
    }

    // If user doesn't exist, create it with a default name
    let userId: string
    let userName: string

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('admin_users')
        .insert([
          {
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
          },
        ])
        .select('id, name')
        .single()

      if (createError) {
        console.error('User creation error:', createError)
        console.error('Creation error details:', { code: createError.code, message: createError.message })
        return { success: false, message: `Error al crear usuario: ${createError.message}` }
      }

      userId = newUser.id
      userName = newUser.name
    } else {
      userId = user.id
      userName = user.name
    }

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP
    const { error: otpError } = await supabase.from('otp_codes').insert([
      {
        email: normalizedEmail,
        code: otp,
        expires_at: expiresAt.toISOString(),
        is_used: false,
      },
    ])

    if (otpError) {
      console.error('OTP storage error:', otpError)
      console.error('OTP error details:', { code: otpError.code, message: otpError.message })
      return { success: false, message: `Error al generar código: ${otpError.message}` }
    }

    // Verify API key
    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY')
      return { success: false, message: 'Error: Resend API no configurada' }
    }

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'Pulso IA - OXY46 <ia@oxy46.com>',
      to: normalizedEmail,
      subject: 'Tu código de acceso: ' + otp,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
          <h2>Código de acceso</h2>
          <p>Hola ${userName},</p>
          <p>Tu código de acceso es:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</span>
          </div>
          <p>Este código expira en 10 minutos.</p>
          <p>Si no solicitaste este código, puedes ignorar este email.</p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Email send error:', emailError)
      console.error('Email error details:', emailError)
      return { success: false, message: `Error al enviar email: ${JSON.stringify(emailError)}` }
    }

    return { success: true, message: 'Código enviado al email' }
  } catch (error) {
    console.error('OTP request error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, message: `Error: ${errorMessage}` }
  }
}

export async function verifyOTP(email: string, code: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    const supabase = createServerClient()

    // Find valid OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_codes')
      .select('id, is_used, expires_at')
      .eq('email', normalizedEmail)
      .eq('code', code)
      .single()

    if (otpError || !otpRecord) {
      return { success: false, message: 'Código inválido' }
    }

    if (otpRecord.is_used) {
      return { success: false, message: 'Código ya fue utilizado' }
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return { success: false, message: 'Código expirado' }
    }

    // Mark OTP as used
    await supabase.from('otp_codes').update({ is_used: true }).eq('id', otpRecord.id)

    // Get user info
    const { data: user } = await supabase
      .from('admin_users')
      .select('id, name, email')
      .eq('email', normalizedEmail)
      .single()

    return {
      success: true,
      message: 'Código verificado',
      user: { id: user?.id, name: user?.name, email: user?.email },
    }
  } catch (error) {
    console.error('OTP verification error:', error)
    return { success: false, message: 'Error al verificar código' }
  }
}

export async function getCurrentUser(userId: string) {
  try {
    const supabase = createServerClient()
    const { data: user } = await supabase
      .from('admin_users')
      .select('id, name, email')
      .eq('id', userId)
      .single()

    return user || null
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}
