# WhatsApp CRM for LittleLearners

Leads from WhatsApp (Meta ads, Google, anywhere), status updates, and 1st / 2nd / 3rd call reminders.
Built with Next.js + Supabase. Works with several WhatsApp numbers.

## Run it on your computer (localhost) - step by step

1. Install Node.js (version 18 or newer) from nodejs.org.
2. Go to supabase.com, create a free project.
3. In Supabase, open **SQL Editor**, paste everything from `supabase/schema.sql`, press **Run**.
4. In Supabase, open **Project Settings > API**. Copy the **Project URL** and the **service_role** key.
5. In this folder, copy `.env.example` to a new file named `.env.local`. Paste the two values. Choose a `CRM_PASSWORD`.
6. Open a terminal in this folder and run:
   - `npm install`
   - `npm run dev`
7. Open http://localhost:3000. The browser asks for a password: type any username and your `CRM_PASSWORD`.

## Test without WhatsApp (fake message)

With `npm run dev` running, open a second terminal and run this (it pretends a parent sent a message):

```
curl -X POST http://localhost:3000/api/whatsapp/webhook -H "Content-Type: application/json" -d '{"entry":[{"changes":[{"field":"messages","value":{"metadata":{"phone_number_id":"TEST1","display_phone_number":"919800000001"},"contacts":[{"wa_id":"919876543210","profile":{"name":"Anita Menon"}}],"messages":[{"from":"919876543210","type":"text","text":{"body":"Fees for maths class for 6 year old?"}}]}}]}]}'
```

Refresh the Leads page: a new lead appears with a 1st call reminder (in 1 hour).

## Connect real WhatsApp later (Coexistence)

1. Create a Meta Business account and a Meta app with the WhatsApp product.
2. Connect your WhatsApp Business app number with **Coexistence** (Embedded Signup). Repeat for each number.
3. In the Meta app, set Webhook callback URL to `https://YOUR-SITE.vercel.app/api/whatsapp/webhook` and your `WHATSAPP_VERIFY_TOKEN`. Subscribe to `messages` and the Coexistence echo field.
4. Put `WHATSAPP_TOKEN` and `WHATSAPP_APP_SECRET` in the environment.
5. In **WhatsApp numbers**, rename each number (for example "Maths line").

Sending a reply from the CRM works only within 24 hours of the customer's last message.

## Put it live (GitHub + Vercel)

1. Push this folder to a new GitHub repository (do not upload `.env.local`).
2. In Vercel, import the repository.
3. Add the same values from `.env.local` under **Settings > Environment Variables**, then deploy.
