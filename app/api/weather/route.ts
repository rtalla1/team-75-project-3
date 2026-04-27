const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=30.62&longitude=-96.325" +
  "&current=temperature_2m,cloud_cover,wind_speed_10m,precipitation" +
  "&timezone=America%2FChicago" +
  "&wind_speed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch";

export async function GET() {
  try {
    const res = await fetch(OPEN_METEO_URL, { next: { revalidate: 600 } });
    const data = await res.json();
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
    return Response.json(data.current);
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return Response.json({ error: "Weather unavailable" }, { status: 502 });
  }
}
