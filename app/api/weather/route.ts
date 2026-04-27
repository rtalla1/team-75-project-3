const MM_PER_INCH = 25.4;

export async function GET() {
  const url =
    "https://api.openweathermap.org/data/2.5/weather" +
    `?lat=30.62&lon=-96.325&units=imperial&appid=${process.env.OPENWEATHERMAP_API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();
    if (!res.ok) throw new Error(`Upstream responded ${res.status}: ${data?.message ?? ""}`);
    const rainMm = data.rain?.["1h"] ?? 0;
    const snowMm = data.snow?.["1h"] ?? 0;
    return Response.json({
      temperature_2m: data.main.temp,
      cloud_cover: data.clouds.all,
      wind_speed_10m: data.wind.speed,
      precipitation: (rainMm + snowMm) / MM_PER_INCH,
    });
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return Response.json({ error: "Weather unavailable" }, { status: 502 });
  }
}
