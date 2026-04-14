import { useState } from "react"
import { RecorderWindow } from "./components/recorder-window"
import { LoginWindow } from "./components/login-window"

type Route = "recorder" | "login"

function getRoute(): Route {
  const hash = window.location.hash.replace("#/", "").replace("/", "")
  if (hash === "login") return "login"
  return "recorder"
}

export default function App() {
  const [route] = useState<Route>(getRoute)
  if (route === "login") return <LoginWindow />
  return <RecorderWindow />
}
