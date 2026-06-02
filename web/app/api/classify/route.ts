import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const inferenceUrl = process.env.INFERENCE_API_URL;
  if (!inferenceUrl) {
    return NextResponse.json(
      { error: "INFERENCE_API_URL is not configured." },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || !(image instanceof Blob)) {
      return NextResponse.json(
        { error: "No image provided. Send a file under the 'image' field." },
        { status: 400 },
      );
    }

    const forwardData = new FormData();
    forwardData.append("image", image as Blob, "upload.jpg");

    const response = await fetch(inferenceUrl, {
      method: "POST",
      body: forwardData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Classification forward error:", error);
    return NextResponse.json(
      { error: "Failed to forward inference request." },
      { status: 500 },
    );
  }
}
