import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import QRCode from 'https://esm.sh/qrcode@1.5.3'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // 1. Claim pending outbox items
  const { data: outboxItems, error: claimError } = await supabase
    .rpc('claim_email_outbox', { p_limit: 10 })

  if (claimError || !outboxItems || outboxItems.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  for (const item of outboxItems) {
    let success = false;
    try {
      if (item.kind === 'booking_confirmation') {
        const payload = item.payload;
        
        // Fetch customer email
        const { data: customer } = await supabase.auth.admin.getUserById(payload.customer_id)
        const email = customer?.user?.email;

        if (email) {
          // Generate QR code (data URL)
          const qrData = JSON.stringify({ ref: payload.booking_ref, bookingId: payload.booking_id, showId: payload.show_id });
          const qrDataUrl = await QRCode.toDataURL(qrData);

          // Upload QR to storage (assuming base64 processing or simply saving data URL isn't strictly necessary if we just attach it or embed it, but instructions say upload to Storage)
          const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
          const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          
          const fileName = `qr_${payload.booking_ref}.png`;
          const { error: uploadError } = await supabase.storage
            .from('qr-tickets')
            .upload(fileName, buffer, { contentType: 'image/png', upsert: true });

          let qrUrl = '';
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('qr-tickets').getPublicUrl(fileName);
            qrUrl = publicUrlData.publicUrl;
            
            // Update booking with QR URL
            await supabase.from('bookings').update({ qr_code_url: qrUrl }).eq('id', payload.booking_id);
          }

          // Send Email
          await resend.emails.send({
            from: Deno.env.get('RESEND_FROM_ADDRESS') || 'Ticket Booking <noreply@yourdomain.com>',
            to: email,
            subject: `Your Tickets are Confirmed - ${payload.booking_ref}`,
            html: `
              <h1>Booking Confirmed!</h1>
              <p>Reference: ${payload.booking_ref}</p>
              ${qrUrl ? `<p>Your QR Ticket:</p><img src="${qrUrl}" alt="QR Ticket" />` : ''}
              <p>Thank you for booking with us.</p>
            `
          });
        }
        success = true;

      } else if (item.kind === 'waitlist_offer') {
        const payload = item.payload;
        
        // Fetch customer email
        const { data: customer } = await supabase.auth.admin.getUserById(payload.customer_id)
        const email = customer?.user?.email;
        
        if (email) {
          const offerUrl = `${frontendUrl}/waitlist/offer/${payload.offer_token}`;
          
          // Send Email
          await resend.emails.send({
            from: Deno.env.get('RESEND_FROM_ADDRESS') || 'Ticket Booking <noreply@yourdomain.com>',
            to: email,
            subject: `A Seat is Available!`,
            html: `
              <h1>Great News!</h1>
              <p>A seat has become available for the show you are waitlisted for.</p>
              <p>You have until ${new Date(payload.expires_at).toLocaleString()} to claim it.</p>
              <a href="${offerUrl}">Click here to complete your booking</a>
            `
          });
        }
        success = true;
      }
    } catch (e) {
      console.error(`Error processing outbox item ${item.id}:`, e);
      success = false;
    }

    // Update outbox status
    await supabase.from('email_outbox')
      .update({
        status: success ? 'sent' : 'failed',
        sent_at: success ? new Date().toISOString() : null,
        attempts: item.attempts + 1
      })
      .eq('id', item.id);
  }

  return new Response(JSON.stringify({ success: true, processed: outboxItems.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
