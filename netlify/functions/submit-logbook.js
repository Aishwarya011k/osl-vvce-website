const { Client } = require('pg')

exports.handler = async function (event, context) {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch (err) {
    return { 
      statusCode: 400, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Invalid JSON' }) 
    }
  }

  const { fullName, USN, CheckInTime, CheckOutTime, reason, progress } = body

  if (!fullName || !USN || !reason) {
    return { 
      statusCode: 400, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Missing required fields' }) 
    }
  }

  const connectionString = process.env.NEON_CONNECTION_STRING
  if (!connectionString) {
    console.error('NEON_CONNECTION_STRING is not set')
    return { 
      statusCode: 500, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Server misconfiguration' }) 
    }
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    const query = `
      INSERT INTO visitor_logs (full_name, usn_id, check_in_time, check_out_time, purpose, progress)
      VALUES ($1, $2, $3, $4, $5, $6)
    `
    const values = [fullName, USN, CheckInTime || null, CheckOutTime || null, reason, progress || null]
    await client.query(query, values)
    await client.end()

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Logbook entry submitted successfully' }),
    }
  } catch (error) {
    console.error('DB error:', error)
    try {
      await client.end()
    } catch (e) {}
    return { 
      statusCode: 500, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Database error' }) 
    }
  }
}
