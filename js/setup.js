const urlInput =
  document.getElementById("setupSupabaseUrl");

const keyInput =
  document.getElementById("setupSupabaseKey");

urlInput.value =
  localStorage.getItem("grocerySaverSupabaseUrl") || "";

keyInput.value =
  localStorage.getItem("grocerySaverSupabaseAnonKey") || "";

function setupMessage(text, type = "success") {
  document.getElementById("setupMessage").innerHTML =
    `<div class="${type}">${text}</div>`;
}

async function saveSupabaseSettings() {
  const url = urlInput.value.trim();
  const key = keyInput.value.trim();

  if (!url || !key) {
    setupMessage(
      "Enter both the Project URL and browser-safe key.",
      "error"
    );
    return;
  }

  try {
    const testClient =
      window.supabase.createClient(url, key);

    const result = await testClient
      .from("products")
      .select("id")
      .limit(1);

    if (result.error) throw result.error;

    localStorage.setItem(
      "grocerySaverSupabaseUrl",
      url
    );

    localStorage.setItem(
      "grocerySaverSupabaseAnonKey",
      key
    );

    setupMessage(
      "Connected successfully. Open the app or Admin dashboard."
    );
  } catch (error) {
    setupMessage(
      error.message ||
      "Connection failed. Run the SQL schema and check your URL and key.",
      "error"
    );
  }
}

function clearSupabaseSettings() {
  localStorage.removeItem("grocerySaverSupabaseUrl");
  localStorage.removeItem("grocerySaverSupabaseAnonKey");

  setupMessage(
    "Supabase connection removed from this browser."
  );
}
