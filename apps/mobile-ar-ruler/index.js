import { registerRootComponent } from "expo";
import { AppRegistry, LogBox } from "react-native";
import App from "./App";

LogBox.ignoreAllLogs(true);

registerRootComponent(App);
AppRegistry.registerComponent("main", () => App);
