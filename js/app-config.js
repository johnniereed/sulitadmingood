window.APP_CONFIG = {
  databaseMode: "supabase",
  consensusRequiredUsers: 3,

  supabaseUrl:
    "https://krqnphjfukzipnplfaiq.supabase.co",

  supabaseAnonKey:
    "sb_publishable_WJWIImNI9iRMcD_HfCFUOQ_QeVujZ3l",

  isConfigured() {
    return Boolean(
      this.supabaseUrl &&
      this.supabaseAnonKey
    );
  }
};
