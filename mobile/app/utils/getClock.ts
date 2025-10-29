export function getClock(time: number) {
  return `${Math.floor(time / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${(time % 60).toString().padStart(2, "0")}`;
}
