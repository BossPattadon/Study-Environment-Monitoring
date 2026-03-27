export async function fetchSensors() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sensors`);
  if (!res.ok)
    throw new Error('Failed to fetch sensor data');
  return res.json();
}