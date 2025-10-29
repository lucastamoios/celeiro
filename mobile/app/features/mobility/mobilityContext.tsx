import React, { useEffect, useState } from "react"
import { mobilityDatabase } from "@/features/mobility/mobilityDatabase"
import BackgroundGeolocation, { Location } from "react-native-background-geolocation"
import { routeManager } from "@/features/mobility/RouteManager"
import * as ExpoLocation from "expo-location"
import { AppState } from "react-native"
import { useAuth } from "@/context/AuthContext"
import { useFocusEffect } from "@react-navigation/native"
import { MobilityDestination, MobilityRunType } from "./mobility-types"

const AuthContext = React.createContext<{
  rideUUID: string | undefined
  latestLocation: Location | undefined
  locationGranted: boolean
  isLocationEnabled: boolean
  isLocationAuthorized: boolean
  getDestination: (destination: MobilityRunType) => MobilityDestination
}>({
  rideUUID: undefined,
  latestLocation: undefined,
  locationGranted: false,
  isLocationEnabled: false,
  isLocationAuthorized: false,
  getDestination: () => ({
    coords: [0, 0],
    address: "",
  }),
})

export function useMobilityContext() {
  const value = React.useContext(AuthContext)
  if (process.env.NODE_ENV !== "production") {
    if (!value) {
      throw new Error("useSession must be wrapped in a <MobilityContext />")
    }
  }
  return value
}

export function MobilityProvider(props: React.PropsWithChildren) {
  const { session, activeOrganization } = useAuth()

  let workDestination: MobilityDestination = {
    coords: [activeOrganization?.latitude ?? 0, activeOrganization?.longitude ?? 0],
    address: activeOrganization?.address ?? "",
  }

  const homeDestination: MobilityDestination = {
    coords: [session?.user.latitude ?? 0, session?.user.longitude ?? 0],
    address: session?.user.address ?? "",
  }

  function getDestination(destination: MobilityRunType): MobilityDestination {
    switch (destination) {
      case "work":
        return workDestination
      case "home":
        return homeDestination
      case "free":
        return null
      default:
        return null
    }
  }

  const [rideUUID, setRideUUID] = useState<string>()
  const [latestLocation, setLatestLocation] = useState<Location>()

  const [isLocationEnabled, setIsLocationEnabled] = useState(false)
  async function checkLocationEnabled() {
    const locationEnabled = await ExpoLocation.hasServicesEnabledAsync()
    setIsLocationEnabled(locationEnabled)
  }

  const [isLocationAuthorized, setIsLocationAuthorized] = useState(false)
  async function checkLocationAuthorized() {
    const permissions = await ExpoLocation.getForegroundPermissionsAsync()
    setIsLocationAuthorized(permissions.granted)
  }

  useFocusEffect(() => {
    void checkLocationEnabled()
    void checkLocationAuthorized()
  })

  useEffect(() => {
    AppState.addEventListener("change", (e) => {
      void checkLocationEnabled()
      void checkLocationAuthorized()
    })
  }, [])

  const locationGranted = isLocationEnabled && isLocationAuthorized

  useEffect(() => {
    if (!session?.user.id) {
      return
    }
    console.info("=============== INIT RIDE =============")
    routeManager.reset()
    mobilityDatabase.insertRide(session?.user.id).then((value) => {
      console.info(`Got uuid: ${value}`)
      setRideUUID(value)
    })
  }, [session?.user.id])

  /** ======================================
     Setup Geo
     ====================================== **/
  useEffect(() => {
    if (!rideUUID) {
      return
    }

    console.info("=============== STARTING RIDE =============")

    const locationSubscriber = BackgroundGeolocation.onLocation(
      (location) => {
        setLatestLocation(location)
        checkLocationEnabled()
        checkLocationAuthorized()
      },
      (error) => {
        checkLocationEnabled()
        checkLocationAuthorized()
      },
    )

    BackgroundGeolocation.start().then((e) => {
      console.info("Started Geo")
      BackgroundGeolocation.changePace(true).then(() => {
        console.info("Set to moving!")
      })
    })

    return () => {
      locationSubscriber.remove()
      BackgroundGeolocation.stop().then(() => {
        console.info("Stopped Geo")
      })
      console.info("=============== ENDING RIDE ===============")
    }
  }, [rideUUID])

  return (
    <AuthContext.Provider
      value={{
        rideUUID,
        latestLocation,
        locationGranted,
        isLocationEnabled,
        isLocationAuthorized,
        getDestination,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  )
}
