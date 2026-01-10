import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    const configStatus = {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      cloudNameLength: cloudName?.length || 0,
      apiKeyLength: apiKey?.length || 0,
      apiSecretLength: apiSecret?.length || 0,
      // Show partial values for debugging
      cloudNameValue: cloudName,
      apiKeyPrefix: apiKey?.substring(0, 6) + '...',
      apiSecretPrefix: apiSecret?.substring(0, 6) + '...',
    }

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'Missing Cloudinary environment variables',
        configStatus,
      })
    }

    // Test with direct REST API call
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/ping`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    )

    const responseText = await response.text()
    let responseJson = null
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      // Not JSON
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: responseJson || responseText,
      configStatus,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
    })
  }
}
