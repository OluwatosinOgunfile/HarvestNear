"use client";

import { ExternalLink, LoaderCircle, Navigation } from "lucide-react";
import { useState } from "react";

type Coordinates = { latitude: number; longitude: number };

function directionsUrl(origin: Coordinates, destination: Coordinates) {
  const route = `${origin.latitude},${origin.longitude};${destination.latitude},${destination.longitude}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`;
}

export function FarmDirectionsLink({ destination, savedOrigin }: { destination: Coordinates; savedOrigin?: Coordinates }) {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");

  function openRoute(origin: Coordinates) {
    window.open(directionsUrl(origin, destination), "_blank", "noopener,noreferrer");
    setLocating(false);
  }

  function handleDirections() {
    setMessage("");
    setLocating(true);
    if (!navigator.geolocation) {
      if (savedOrigin) return openRoute(savedOrigin);
      setLocating(false);
      setMessage("Location is unavailable. Add a saved location in your profile.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => openRoute({ latitude: coords.latitude, longitude: coords.longitude }),
      () => {
        if (savedOrigin) return openRoute(savedOrigin);
        setLocating(false);
        setMessage("Allow location access to get directions to this farm.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  return <div className="store-directions">
    <button type="button" onClick={handleDirections} disabled={locating}>
      {locating ? <LoaderCircle className="spin" size={17}/> : <Navigation size={17}/>}
      {locating ? "Finding your location..." : "Get directions"}
      {!locating && <ExternalLink size={15}/>} 
    </button>
    {message && <small role="status">{message}</small>}
  </div>;
}
