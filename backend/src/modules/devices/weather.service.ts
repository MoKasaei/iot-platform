export interface CurrentWeather {
    temperature: number;
    relativeHumidity: number;
    dewPoint: number;
    weatherCode: number;
    observedAt: string;
    source: "Open-Meteo";
    sourceLatitude: number;
    sourceLongitude: number;
    distanceKm: number;
}

function distanceKm(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number
): number {
    const radians = (value: number) => value * Math.PI / 180;
    const earthRadiusKm = 6371;
    const deltaLatitude = radians(latitudeB - latitudeA);
    const deltaLongitude = radians(longitudeB - longitudeA);
    const a =
        Math.sin(deltaLatitude / 2) ** 2 +
        Math.cos(radians(latitudeA)) *
        Math.cos(radians(latitudeB)) *
        Math.sin(deltaLongitude / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function getCurrentWeather(
    latitude: number,
    longitude: number
): Promise<CurrentWeather> {
    const query = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "dew_point_2m",
            "weather_code"
        ].join(","),
        timezone: "auto"
    });
    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${query.toString()}`,
        { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) {
        throw new Error(`Weather provider returned ${response.status}`);
    }

    const result = await response.json() as {
        latitude: number;
        longitude: number;
        current: {
            temperature_2m: number;
            relative_humidity_2m: number;
            dew_point_2m: number;
            weather_code: number;
            time: string;
        };
    };

    return {
        temperature: result.current.temperature_2m,
        relativeHumidity: result.current.relative_humidity_2m,
        dewPoint: result.current.dew_point_2m,
        weatherCode: result.current.weather_code,
        observedAt: result.current.time,
        source: "Open-Meteo",
        sourceLatitude: result.latitude,
        sourceLongitude: result.longitude,
        distanceKm: Number(
            distanceKm(
                latitude,
                longitude,
                result.latitude,
                result.longitude
            ).toFixed(2)
        )
    };
}
