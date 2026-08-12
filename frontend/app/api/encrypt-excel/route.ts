import { NextRequest, NextResponse } from "next/server";
import officeCrypto from "officecrypto-tool";

export async function POST(req: NextRequest) {
  try {
    const password = req.headers.get("x-password");
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Encrypt the excel file
    const encryptedBuffer = await officeCrypto.encrypt(buffer, { password });

    return new NextResponse(new Uint8Array(encryptedBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="encrypted.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Encryption error:", error);
    return NextResponse.json({ error: "Failed to encrypt file", details: error.message }, { status: 500 });
  }
}
