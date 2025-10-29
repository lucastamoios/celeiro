import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";

export function HeaderOld(props: NativeStackHeaderProps & {
  companyLogo: string
}) {
  const insets = useSafeAreaInsets();
  const canGoBack = props.navigation.canGoBack();

  if (props.options.headerShown === false) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.select({
            android: insets.top + 30,
            ios: insets.top,
          }),
        },
      ]}
    >
      <StatusBar style="light" />

      <View style={styles.headerContent}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => props.navigation.goBack()}>
            <Feather name="chevron-left" size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <Feather name="chevron-left" size={24} color="black" />
        )}

        <View style={styles.logoContainer}>
          <Image
              contentFit={'contain'}
              contentPosition={'right'}
            source={require("../assets/images/logo.svg")}
            style={styles.logo}
          />
          <Feather name={'plus'} size={12} color={'white'} />
          <Image
            contentFit={'contain'}
            contentPosition={'left'}
            source={props.companyLogo}
            style={styles.companyLogo}
          />
        </View>

        <Feather name="chevron-left" size={24} color="black" />
      </View>

      {typeof props.options.headerTitle !== "function" ? (
        <Text>{props.options.headerTitle}</Text>
      ) : (
        <>
          {props.options.headerTitle({
            children: props.options.title ?? "",
            tintColor: props.options.headerTintColor,
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",

  },
  logoContainer: {
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    flexDirection: 'row',
    flex: 1,
    gap: 10,
    color: 'white',
  },
  logo: {
    height: 30,
    maxWidth: 50,
    flex: 1
  },
  companyLogo: {
    height: 30,
    maxWidth: 50,
    flex: 1
  },
});
