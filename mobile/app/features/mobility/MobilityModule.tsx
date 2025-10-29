import React, { useEffect, useRef, useState } from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import {
  Point,
  DestinationInfo,
  GeoPoint,
  MobilityDestination,
  Mode,
} from "@/features/mobility/mobility-types";
import { RideTypeButton } from "@/features/mobility/components/RideTypeButton";
import { ActionButton } from "@/components/ActionButton";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { BlurView } from "expo-blur";
import { DataDisplay } from "@/components/DataDisplay";
import { PageWithInsets } from "@/components/PageWithInsets";
import { mobilityDatabase } from "@/features/mobility/mobilityDatabase";
import { useMobilityContext } from "@/features/mobility/mobilityContext";
import { haversineDistance } from "@/features/mobility/haversineDistance";
import { getGoogleMapsRoute } from "@/features/mobility/googleMapsRoute";
import { routeManager } from "@/features/mobility/RouteManager";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/context/AuthContext";
import { getClock } from "@/utils/getClock";
import { formatToBrazilianDate } from "@/utils/formatToBrazilianTime";
import { RideType } from "@/features/mobility/models";
import { useAppTheme } from "@/theme/context";
import type { ThemedStyle } from "@/theme/types";
//
import { api } from "@/services/api";

interface MobilityProps {
  destination: MobilityDestination;
  navigation: NativeStackNavigationProp<any>;
}

export default function MobilityModule(props: MobilityProps) {
  const { rideUUID, latestLocation } = useMobilityContext();
  const { session } = useAuth();
  const { themed } = useAppTheme();
  const insets = useSafeAreaInsets();

  /** ======================================
     Refs
     ====================================== **/
  const mapRef = useRef<MapView>(null);
  const timeout = useRef<any | null>(null);
  const startTime = useRef<number>(0);

  /** ======================================
     State
     ====================================== **/
  const [mode, setMode] = useState<Mode>("select");
  const [rideType, setRideType] = useState<RideType>("bicycle");
  const [currPoint, setCurrPoint] = useState<GeoPoint | null>(null);
  const [startingPoint, setStartingPoint] = useState<Point | null>(null);
  const [destinationInfo, setDestinationInfo] =
    useState<DestinationInfo | null>(null);
  const [tracedRoute, setTracedRoute] = useState<GeoPoint[]>([]);
  const [timer, setTimer] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [endTimer, setEndTimer] = useState(0);
  const [closeModal, setCloseModal] = useState(false);
  const [pointsRewarded, setPointsRewarded] = useState<number>(0);
  const [finishDateTime, setFinishDateTime] = useState<string>("");
  const [rideSavingState, setRideSavingState] = useState<
    "saving" | "success" | "fail"
  >("saving");

  /** ======================================
     Actions
     ====================================== **/
  async function startTracking() {
    setMode("track");
    startTime.current = new Date().getTime();
    timeout.current = setInterval(() => {
      const currTime = new Date().getTime();
      const diff = currTime - startTime.current;
      const value = Math.floor(diff / 1000);
      setTimer(value);
    }, 1000);
  }

  async function finishTracking() {
    setMode("finish");
    setEndTimer(timer);

    try {
      if (!rideUUID) {
        throw new Error("NO RIDE ID");
      }

      if (!session?.user.id) {
        throw new Error("NO USER ID");
      }

      const ride = await mobilityDatabase.getRide(session?.user.id, rideUUID);
      if (!ride) {
        throw new Error("COULDNT RETRIEVE RIDE FROM DB");
      }

      if (!ride.geo_points) {
        setPointsRewarded(0);
        setFinishDateTime(formatToBrazilianDate(new Date()));
        setRideSavingState("success");
        return;
      }

      await api.createRide({
        uuid: ride.uuid,
        geo_points: ride.geo_points,
        raw_coords: ride.raw_coords,
        start_time: ride.start_time,
        finish_time: ride.finish_time,
        freeroam: ride.freeroam,
        distance: ride.distance,
        type: ride.type as RideType,
      });
      await mobilityDatabase.markRideAsCompleted(session?.user.id, rideUUID);
      // TODO: Get points.
      setPointsRewarded(1234);
      setFinishDateTime(formatToBrazilianDate(ride.finish_time));
      setRideSavingState("success");
    } catch (e) {
      console.error(e);
      setRideSavingState("fail");
    }
  }

  /** ======================================
     Setup Destination
     ====================================== **/
  useEffect(() => {
    async function setupDestination() {
      if (!props.destination || !currPoint) {
        return;
      }

      const destPoint = props.destination.coords;
      const directions = await getGoogleMapsRoute(
        [currPoint[0], currPoint[1]],
        destPoint,
      );
      if (directions) {
        setDestinationInfo(directions);
      }
    }

    if (!destinationInfo) {
      void setupDestination();
    }
  }, [currPoint]);

  function adjustMap(
    map: MapView | null,
    currPoint: GeoPoint,
    destination: MobilityDestination,
    startingPoint?: Point,
    animated: boolean = true,
  ) {
    if (!map) {
      return;
    }

    const coords: Point[] = [];

    if (startingPoint) {
      if (startingPoint[0] !== currPoint[0]) {
        coords.push(startingPoint);
      }
    }

    coords.push([currPoint[0], currPoint[1]]);

    if (destination) {
      coords.push(destination.coords);
    }

    if (coords.length === 1) {
      map.animateToRegion({
        latitude: coords[0][0],
        longitude: coords[0][1],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      return;
    }

    const padding = destination ? 80 : 90;

    map.fitToCoordinates(
      coords.map((c) => ({
        latitude: c[0],
        longitude: c[1],
      })),
      {
        edgePadding: {
          top: padding,
          right: padding,
          bottom: padding,
          left: padding,
        },
        animated: animated,
      },
    );
  }

  /** ======================================
     Main listener
     ====================================== **/
  useEffect(() => {
    if (!latestLocation || !session?.user.id || !rideUUID) return;
    const destPoint = props.destination?.coords;

    const lat = latestLocation?.coords?.latitude;
    const long = latestLocation?.coords?.longitude;
    if (!lat || !long) {
      return;
    }
    const distanceFromDestination = destPoint
      ? haversineDistance([lat, long], destPoint)
      : -1;
    const hasArrived =
      distanceFromDestination !== -1 && distanceFromDestination < 0.1;

    switch (mode) {
      /* SELECT MODE: Only updates current point and adjusts map accordingly */
      case "select":
        const newPoint: GeoPoint = [lat, long, 0, 0, 0];
        adjustMap(mapRef.current, newPoint, null, destPoint);
        setCurrPoint(newPoint);
        break;

      /* TRACK MODE: Updates current point and draws route*/
      case "track":
        {
          routeManager.addCoordinate(latestLocation);
          const totalDistance = routeManager.totalDistance;
          const nextGeoPoints = routeManager.geoPoints;

          let nextStartingPoint = startingPoint;
          if (nextStartingPoint === null) {
            nextStartingPoint = [lat, long];
            setStartingPoint(nextStartingPoint);
          }

          adjustMap(
            mapRef.current,
            nextGeoPoints.at(-1)!,
            props.destination,
            nextStartingPoint,
          );

          void mobilityDatabase.updateRide(
            session?.user.id,
            rideUUID,
            rideType,
            !Boolean(props.destination),
            nextGeoPoints,
            routeManager.coordinates,
            totalDistance,
          );

          setTracedRoute(nextGeoPoints);
          setCurrPoint(nextGeoPoints.at(-1)!);
          setTotalDistance(totalDistance);

          if (hasArrived) {
            void finishTracking();
          }
        }
        break;
      default:
        break;
    }
  }, [latestLocation]);

  /** ======================================
     View
     ====================================== **/
  if (mode !== "finish") {
    return (
      <>
        <View style={themed($container)}>
          {mode === "select" ? (
            <TouchableOpacity
              style={[themed($backButton), { top: insets.top + 20 }]}
              onPress={() => props.navigation.goBack()}
            >
              <Feather name="chevron-left" size={24} color="black" />
            </TouchableOpacity>
          ) : null}

          <MapView ref={mapRef} style={themed($map)} provider={PROVIDER_GOOGLE}>
            {tracedRoute.length > 0 && (
              <Polyline
                coordinates={tracedRoute.map((p) => ({
                  latitude: p[0],
                  longitude: p[1],
                }))}
                strokeColor="#43A047"
                strokeWidth={4}
                zIndex={2}
              />
            )}
            {!!destinationInfo && (
              <Polyline
                coordinates={destinationInfo.points.map((p) => ({
                  latitude: p[0],
                  longitude: p[1],
                }))}
                strokeColor="#43A047"
                strokeWidth={2}
                lineDashPattern={[5]}
                zIndex={1}
              />
            )}
            {currPoint && (
              <Marker
                coordinate={{ latitude: currPoint[0], longitude: currPoint[1] }}
                zIndex={10}
              >
                <Image
                  source={
                    rideType === "walking"
                      ? require("../../assets/images/walkmarker.png")
                      : require("../../assets/images/bikemarker.png")
                  }
                  style={{ height: 35, width: 45 }}
                />
              </Marker>
            )}
            {props.destination && (
              <Marker
                pinColor={"#81E54D"}
                coordinate={{
                  latitude: props.destination.coords[0],
                  longitude: props.destination.coords[1],
                }}
              />
            )}
            {startingPoint && (
              <Marker
                coordinate={{
                  latitude: startingPoint[0],
                  longitude: startingPoint[1],
                }}
              />
            )}
          </MapView>

          <View
            style={[
              themed($bottomContainer),
              {
                paddingBottom: Platform.select({
                  android: (insets?.bottom ?? 0) + 30,
                  ios: insets?.bottom,
                }),
              },
            ]}
          >
            {mode === "select" && (
              <>
                {props.destination && (
                  <View style={themed($destinationInfoContainer)}>
                    <View>
                      <Text style={themed($destinationTitle)}>Trabalho</Text>
                      <Text style={themed($destinationAddress)}>
                        {props.destination.address}
                      </Text>
                    </View>
                    {destinationInfo && (
                      <View style={themed($distanceContainer)}>
                        <Text style={themed($distanceText)}>
                          {(destinationInfo.distanceMeters / 1000).toFixed(2)}km
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <Text style={themed($mainTitle)}>
                  {props.destination ? "Ir para o trabalho" : "Corrida Livre"}
                </Text>
                <Text style={themed($subtitle)}>Escolha como você irá:</Text>
                <RideTypeButton
                  options={[
                    {
                      label: "Caminhada",
                      value: "walking",
                      duration: destinationInfo?.durationSecondsWalking,
                      icon: require("../../assets/images/walking-icon.svg"),
                    },
                    {
                      label: "Bicicleta",
                      value: "bicycle",
                      duration: destinationInfo?.durationSeconds,
                      icon: require("../../assets/images/cycling-icon.svg"),
                    },
                  ]}
                  onSelect={setRideType}
                  selectedValue={rideType}
                />
                <ActionButton
                  disabled={!rideUUID}
                  onPress={startTracking}
                  text={"Iniciar Trajeto"}
                />
              </>
            )}

            {mode === "track" && (
              <View style={themed($trackingContainer)}>
                <Text style={themed($trackingTitle)}>
                  Seu trajeto está em curso.
                </Text>
                <View style={themed($timerContainer)}>
                  <Text style={themed($timerText)}>{getClock(timer)}</Text>
                </View>

                <DataDisplay
                  items={[
                    {
                      label: "Distância Percorrida",
                      value: `${(totalDistance / 1000).toFixed(2)} Km`,
                      icon: require("../../assets/images/distance-icon.svg"),
                    },
                    {
                      label: "Velocidade Estimada",
                      value: `${(currPoint?.[2] ?? 0).toFixed(2)} Km/h`,
                      icon: require("../../assets/images/speed-icon.svg"),
                    },
                  ]}
                />

                <ActionButton
                  variant={"black"}
                  onPress={() => setCloseModal(true)}
                  text={"Finalizar Trajeto"}
                />
              </View>
            )}
          </View>
        </View>

        <Modal visible={closeModal} animationType="slide" transparent={true}>
          <BlurView intensity={6} style={themed($modalContainer)}>
            <View style={themed($modalContent)}>
              <Text style={themed($modalTitle)}>
                Tem certeza que deseja finalizar?
              </Text>
              <ActionButton
                variant={"black"}
                onPress={() => finishTracking()}
                text={"Finalizar percurso"}
              />
              <ActionButton
                variant={"gray"}
                onPress={() => setCloseModal(false)}
                text={"Continuar"}
              />
            </View>
          </BlurView>
        </Modal>
      </>
    );
  }

  return (
    <PageWithInsets style={themed($finishContainer)}>
      <View style={themed($finishTopContainer)}>
        <Image
          source={require("../../assets/images/finish-ride.svg")}
          style={themed($finishImage)}
        />
        <Text style={themed($finishTitle)}>Você finalizou o seu trajeto</Text>
      </View>

      <View style={themed($finishBottomContainer)}>
        <DataDisplay
          items={[
            {
              label: "Tempo de percurso",
              value: getClock(endTimer),
              icon: require("../../assets/images/time-icon.svg"),
            },
            {
              label: "Distância Percorrida",
              value: `${(totalDistance / 1000).toFixed(2)} Km`,
              icon: require("../../assets/images/distance-icon.svg"),
            },
            {
              label: "Velocidade Estimada",
              value: `${(currPoint?.[2] ?? 0).toFixed(2)} Km/h`,
              icon: require("../../assets/images/speed-icon.svg"),
            },
            {
              label: "Registrado em:",
              value: finishDateTime,
              icon: require("../../assets/images/date-icon.svg"),
            },
          ]}
        />

        <View style={themed($savingStatusContainer)}>
          {rideSavingState === "saving" ? (
            <>
              <ActivityIndicator size={24} color={"black"} />
              <Text style={themed($savingText)}>Salvando...</Text>
            </>
          ) : rideSavingState === "fail" ? (
            <Text style={themed($failText)}>
              Sua conexão está instável. Mas não se preocupe, tentaremos salvar
              a corrida em um outro momento.
            </Text>
          ) : (
            <>
              <Text style={themed($rewardText)}>Rendeu a você:</Text>
              <ScoreDisplay score={pointsRewarded} />
            </>
          )}
        </View>

        <ActionButton
          style={themed($homeButton)}
          textStyle={themed($homeButtonText)}
          onPress={() => {
            props.navigation.navigate("Home");
          }}
          disabled={rideSavingState === "saving"}
          text={"Voltar para o início"}
        />
      </View>
    </PageWithInsets>
  );
}

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: "100%",
  position: "relative",
  backgroundColor: colors.background,
})

const $backButton: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  left: 16,
  zIndex: 50,
  padding: 8,
  borderRadius: 9999,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "white",
})

const $map: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  height: "100%",
  flex: 1,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  justifyContent: "center",
  paddingTop: spacing.md,
  paddingHorizontal: spacing.lg,
})

const $destinationInfoContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginBottom: spacing.sm,
})

const $destinationTitle: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "bold",
})

const $destinationAddress: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
})

const $distanceContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.backgroundSecondary,
  padding: 4,
  borderRadius: 4,
})

const $distanceText: ThemedStyle<TextStyle> = () => ({
  width: "100%",
  fontSize: 14,
})

const $mainTitle: ThemedStyle<TextStyle> = () => ({
  textAlign: "center",
  fontSize: 18,
  fontWeight: "800",
})

const $subtitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
  fontSize: 16,
  fontWeight: "500",
  color: colors.textDim,
  marginBottom: spacing.lg,
})

const $trackingContainer: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
})

const $trackingTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 18,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: spacing.lg,
})

const $timerContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundSecondary,
  width: "100%",
  paddingVertical: spacing.md,
  borderRadius: 9999,
  marginBottom: spacing.md,
})

const $timerText: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
  textAlign: "center",
})

const $modalContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.lg,
})

const $modalContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "100%",
  padding: spacing.lg,
  borderRadius: 8,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
  backgroundColor: "white",
})

const $modalTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontWeight: "bold",
  textAlign: "center",
  fontSize: 24,
  marginBottom: spacing.md,
})

const $finishContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
})

const $finishTopContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.lg,
})

const $finishImage: ThemedStyle<ImageStyle> = () => ({
  height: 160,
  width: 160,
})

const $finishTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 24,
  textAlign: "center",
  fontWeight: "bold",
  marginTop: spacing.xs,
})

const $finishBottomContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.xl,
  width: "100%",
})

const $savingStatusContainer: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
})

const $savingText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontWeight: "bold",
  fontSize: 18,
  marginLeft: spacing.xs,
})

const $failText: ThemedStyle<TextStyle> = () => ({
  textAlign: "center",
})

const $rewardText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontWeight: "bold",
  marginRight: spacing.xs,
})

const $homeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
  backgroundColor: "black",
})

const $homeButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
})
