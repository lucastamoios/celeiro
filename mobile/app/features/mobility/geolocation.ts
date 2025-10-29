import BackgroundGeolocation from "react-native-background-geolocation"

class GeolocationSystem {
  public isReady: boolean = false

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    BackgroundGeolocation.ready({
      distanceFilter: 6,
      stopTimeout: 120,
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_NAVIGATION,
      locationAuthorizationAlert: {
        titleWhenNotEnabled: "Serviços de localização não habilitados",
        titleWhenOff: "Serviços de localização desativados",
        instructions:
          "É necessário habilitar 'Sempre' nos serviços de localização",
        cancelButton: "Cancelar",
        settingsButton: "Configurações",
      },
    }).then(() => {
      console.log("Geolocation ready!")
      this.isReady = true
    })
  }
}

let globalGeolocationSystemInstance: GeolocationSystem | null = null

export function getGeolocationSystem() {
  if (globalGeolocationSystemInstance === null) {
    globalGeolocationSystemInstance = new GeolocationSystem()
  }
  return globalGeolocationSystemInstance
}
