let preparedNavigationUrl = "";

function getSelectedTripPlan() {
  if (typeof getSelectedPlan === "function") {
    return getSelectedPlan();
  }

  return JSON.parse(
    localStorage.getItem("selectedPlan") || "null"
  );
}

function renderTripDetails() {
  const plan = getSelectedTripPlan();
  const container =
    document.getElementById("tripDetails");

  if (
    !plan ||
    !Array.isArray(plan.storeIds) ||
    plan.storeIds.length === 0
  ) {
    container.innerHTML = `
      <div class="card empty">
        <div style="font-size:48px;margin-bottom:10px">
          🚫
        </div>

        <h2>No trip selected</h2>

        <p class="muted">
          Choose Route 1 or Route 2 first.
        </p>

        <br>

        <a class="button" href="plans.html">
          Return to shopping plans
        </a>
      </div>
    `;

    return;
  }

  const storeNames =
    Array.isArray(plan.storeNames)
      ? plan.storeNames
      : [];

  const stopsHtml = storeNames
    .map((name, index) => `
      <div class="trip-stop">
        <div class="trip-stop-number">
          ${index + 1}
        </div>

        <div>
          <strong>${name}</strong>

          <div class="muted">
            Shopping stop ${index + 1}
          </div>
        </div>
      </div>
    `)
    .join("");

  const basketTotal =
    Number(plan.basketTotal || 0);

  const gasCost =
    Number(plan.gasCost || 0);

  const totalTrip =
    basketTotal + gasCost;

  container.innerHTML = `
    <div class="card trip-summary-card">

      <div class="trip-summary-head">
        <span class="trip-route-label">${plan.title || "Shopping Route"}</span>
        <h2>Your shopping trip</h2>
      </div>

      <div class="muted">
        ${storeNames.length}
        ${storeNames.length === 1
          ? "store"
          : "stores"}
      </div>

      <div class="trip-stops">
        ${stopsHtml}
      </div>

      <div class="item row space">
        <span>Groceries</span>

        <strong>
          ${money(basketTotal)}
        </strong>
      </div>

      <div class="item row space">
        <span>Estimated gas</span>

        <strong>
          ${money(gasCost)}
        </strong>
      </div>

      <div class="item row space">
        <span>Estimated time</span>

        <strong>
          ${Number(plan.estimatedTime || 0)} min
        </strong>
      </div>

      <div class="trip-total row space">
        <span>Total trip estimate</span>

        <strong>
          ${money(totalTrip)}
        </strong>
      </div>

      <button
        id="startNavigationButton"
        type="button"
        onclick="startNavigating()"
      >
        Start Navigating
      </button>

    </div>
  `;
}

function showRouteMessage(text, type = "") {
  const message =
    document.getElementById("routeMessage");

  if (!message) return;

  message.innerHTML = `
    <div class="${type || "notice"}">
      ${text}
    </div>
  `;
}

async function startNavigating() {
  const plan = getSelectedTripPlan();

  if (
    !plan ||
    !Array.isArray(plan.storeIds) ||
    plan.storeIds.length === 0
  ) {
    showRouteMessage(
      "Choose a shopping plan first.",
      "error"
    );
    return;
  }

  if (!navigator.geolocation) {
    showRouteMessage(
      "Location is not supported on this device.",
      "error"
    );
    return;
  }

  const button =
    document.getElementById(
      "startNavigationButton"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Preparing navigation…";
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      openGoogleMapsRoute(
        position,
        plan
      );
    },

    error => {
      if (button) {
        button.disabled = false;
        button.textContent =
          "Start Navigating";
      }

      const messages = {
        1: "Please allow location access in Safari or your browser settings.",
        2: "Your current location could not be determined.",
        3: "The location request timed out. Try again."
      };

      showRouteMessage(
        messages[error.code] ||
        "Location could not be accessed.",
        "error"
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    }
  );
}

async function openGoogleMapsRoute(
  position,
  plan
) {
  const userLat =
    position.coords.latitude;

  const userLng =
    position.coords.longitude;

  const nearestBranches =
    plan.storeIds
      .map(chainId =>
        findNearestBranch(
          chainId,
          userLat,
          userLng
        )
      )
      .filter(Boolean);

  if (!nearestBranches.length) {
    showRouteMessage(
      "No nearby store branches were found.",
      "error"
    );

    resetNavigationButton();
    return;
  }

  const resolvedBranches =
    await Promise.all(
      nearestBranches.map(branch =>
        typeof resolveBranchCoordinates ===
        "function"
          ? resolveBranchCoordinates(branch)
          : Promise.resolve(branch)
      )
    );

  resolvedBranches.sort(
    (first, second) =>
      getDistance(
        userLat,
        userLng,
        first.lat,
        first.lng
      ) -
      getDistance(
        userLat,
        userLng,
        second.lat,
        second.lng
      )
  );

  const finalStore =
    resolvedBranches[
      resolvedBranches.length - 1
    ];

  const destination =
    typeof branchMapsDestination ===
    "function"
      ? branchMapsDestination(finalStore)
      : `${finalStore.chain}, ${finalStore.address}`;

  const waypoints =
    resolvedBranches
      .slice(0, -1)
      .map(branch =>
        typeof branchMapsDestination ===
        "function"
          ? branchMapsDestination(branch)
          : `${branch.chain}, ${branch.address}`
      )
      .join("|");

  let mapsUrl =
    "https://www.google.com/maps/dir/?api=1" +
    `&origin=${encodeURIComponent(
      `${userLat},${userLng}`
    )}` +
    `&destination=${encodeURIComponent(
      destination
    )}` +
    "&travelmode=driving" +
    "&dir_action=navigate";

  if (waypoints) {
    mapsUrl +=
      `&waypoints=${encodeURIComponent(
        waypoints
      )}`;
  }

  localStorage.setItem(
    "shoppingSessionActive",
    "true"
  );

  localStorage.setItem(
    "shoppingReturnPromptPending",
    "true"
  );

  localStorage.setItem(
    "shoppingNavigationStartedAt",
    String(Date.now())
  );

  const mapsWindow = window.open(
    mapsUrl,
    "_blank"
  );

  if (!mapsWindow) {
    showRouteMessage(
      "Please allow pop-ups so navigation can open.",
      "error"
    );
  }

  resetNavigationButton();
}

function resetNavigationButton() {
  const button =
    document.getElementById(
      "startNavigationButton"
    );

  if (!button) return;

  button.disabled = false;
  button.textContent =
    "Start Navigating";
}

renderTripDetails();


function checkForShoppingReturn() {
  const pending =
    localStorage.getItem(
      "shoppingReturnPromptPending"
    ) === "true";

  const startedAt = Number(
    localStorage.getItem(
      "shoppingNavigationStartedAt"
    ) || 0
  );

  const enoughTimePassed =
    Date.now() - startedAt > 1500;

  if (!pending || !enoughTimePassed) {
    return;
  }

  const modal =
    document.getElementById(
      "shoppingReturnModal"
    );

  if (modal) {
    modal.classList.add("show");
  }
}

function continueShopping() {
  localStorage.setItem(
    "shoppingReturnPromptPending",
    "false"
  );

  document
    .getElementById("shoppingReturnModal")
    ?.classList.remove("show");

  window.location.href =
    "list.html?shopping=1";
}

function finishShopping() {
  localStorage.setItem(
    "shoppingReturnPromptPending",
    "false"
  );

  localStorage.setItem(
    "shoppingSessionActive",
    "false"
  );

  document
    .getElementById("shoppingReturnModal")
    ?.classList.remove("show");

  window.location.href =
    "savings.html?fromShopping=1&scan=1";
}

window.addEventListener(
  "focus",
  () => {
    setTimeout(
      checkForShoppingReturn,
      400
    );
  }
);

window.addEventListener(
  "pageshow",
  () => {
    setTimeout(
      checkForShoppingReturn,
      400
    );
  }
);

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState === "visible"
    ) {
      setTimeout(
        checkForShoppingReturn,
        400
      );
    }
  }
);
