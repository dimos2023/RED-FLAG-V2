import { NextResponse } from "next/server";

type Body = {
  reportId?: string;
};

export async function POST(request: Request) {
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.reportId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const stripeSecret: string | undefined = process.env.STRIPE_SECRET_KEY;
  if (stripeSecret) {
    return NextResponse.json({
      ok: true,
      note:
        "Stripe configured: implement Checkout Session creation server-side for this report.",
    });
  }
  return NextResponse.json({
    ok: true,
    checkoutUrl: undefined as string | undefined,
    note:
      "Stripe is not configured: set STRIPE_SECRET_KEY on the server and create a Checkout Session that unlocks signed evidence URLs after payment.",
  });
}
