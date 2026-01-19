/* -------------------------------------------------------------------------- */
/*  CORE / GEO — PROVIDERS EXPORT HUB                                          */
/*  File: core/geo/providers/index.ts                                         */
/* -------------------------------------------------------------------------- */
/*                                                                            */
/*  📦 Centralized exports for Geo providers                                  */
/*  🎯 Zero side-effects • Tree-shaking • Governance                           */
/*                                                                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* 📡 GPS PROVIDER                                                            */
/* -------------------------------------------------------------------------- */

export {
  GPSGeoProvider,
  GeolocationLike,
} from "./gps.provider";

/* -------------------------------------------------------------------------- */
/* 🌐 IP PROVIDER                                                             */
/* -------------------------------------------------------------------------- */

export {
  IPGeoProvider,
  IPGeoAPI,
} from "./ip.provider";

/* -------------------------------------------------------------------------- */
/* 📴 OFFLINE PROVIDER                                                        */
/* -------------------------------------------------------------------------- */

export {
  OfflineGeoProvider,
} from "./offline.provider";

/* -------------------------------------------------------------------------- */
/* 🔮 FUTURE EXTENSIONS                                                       */
/* -------------------------------------------------------------------------- */
/*
export { WifiGeoProvider } from "./wifi.provider";
export { BluetoothGeoProvider } from "./bluetooth.provider";
export { SatelliteGeoProvider } from "./satellite.provider";
*/
