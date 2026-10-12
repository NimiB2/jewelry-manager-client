# Jewelry Manager: client

The web app of a business-management system I built for a real handmade-jewelry business. Hebrew,
right-to-left, mobile-first, and used every day on a phone.

The backend lives in a separate repository: **jewelry-manager-server**.

## Screens

- **Home**: what needs attention, the month at a glance, and the three most-used actions.
- **Orders**: a list with status flow and preparation stages, an approval area for orders arriving from the
  online store, and a ready-to-send order summary for the customer.
- **Products**: a catalog with live recommended prices, and a calculator that shows how a price is built.
- **Finances**: income and expenses, recurring expenses, invoices with an AI reader that fills the form from a photo.
- **Tasks**, **Settings** (materials, labor rate, fees, additions, collections) and a store-import screen.

## Stack

React 19, TypeScript, Vite, Firebase Auth. No UI framework: a small set of shared style objects and CSS
variables for the colors. The route lives in the URL hash, so refresh and the back button work.

## Things I cared about

- **Simple for a non-technical user**: few taps, plain Hebrew, one calm screen per task.
- **A consistent color language**: amber means "waiting for you", red is a problem, green is done or income.
- **Resilient on a phone**: reads retry by themselves when the server is restarting, and writes are never
  repeated automatically.
- **Nothing sensitive in the client**: the API address and the public Firebase config come from environment
  variables; all authorization happens on the server.

## Run it

```bash
npm install
cp .env.example .env     # fill in the values
npm run dev              # http://localhost:5173
npm run build            # type-check and production build
npm run lint
```

`VITE_API_URL` points at the server (default `http://localhost:3000`).
