declare module "urlcat" {
  function urlcat(baseUrl: string, params: Record<string, string | number | boolean>): string
  export default urlcat
} 