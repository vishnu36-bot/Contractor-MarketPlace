// BuildMate India - Full-Stack Client Application Logic

const API_BASE = "";

// Global App State
let appState = {
  currentUser: {
    id: 1,
    name: "Ramesh Kumar",
    phone: "9876543210",
    role: "customer",
    contractor_profile: null
  },
  activeMainTab: "contractors",
  activeContractorSubTab: "materials",
  activeCustomerSubTab: "quotes",
  activeModalTab: "materials",
  cart: [],
  fulfillmentMethod: "doorstep",
  deliveryFee: 150,
  currentContractorDetail: null,
  activeGuidanceContractor: null,
  activeQuoteRequest: null,
  searchDebounceTimer: null
};

// Initial document ready
document.addEventListener("DOMContentLoaded", async () => {
  await switchUserRole("customer", false);
  await fetchContractors();
  await fetchMaterials();
  updateCartBadge();
});

// Toast notification helper
function showToast(message, isSuccess = true) {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");

  toastMsg.textContent = message;
  toastIcon.className = isSuccess 
    ? "fa-solid fa-circle-check text-emerald-400" 
    : "fa-solid fa-triangle-exclamation text-amber-400";

  toast.classList.remove("translate-y-20", "opacity-0");
  toast.classList.add("translate-y-0", "opacity-100");

  setTimeout(() => {
    toast.classList.remove("translate-y-0", "opacity-100");
    toast.classList.add("translate-y-20", "opacity-0");
  }, 3500);
}

// ----------------- USER & DEMO SWITCHING -----------------
async function switchUserRole(role, notify = true) {
  try {
    const res = await fetch(`${API_BASE}/api/users/demo-accounts`);
    const users = await res.json();
    let target = users.find(u => u.role === role);

    if (target) {
      appState.currentUser = target;
      
      // Update Navbar info
      document.getElementById("userNameNav").textContent = target.name.split(" ")[0] + " " + (target.name.split(" ")[1] || "");
      document.getElementById("userRoleNav").textContent = target.role;
      document.getElementById("userAvatar").textContent = target.name.charAt(0).toUpperCase();

      // Configure Portal Sub-bar
      renderPortalSubBar();

      if (notify) {
        showToast(`Switched account to: ${target.name} (${target.role.toUpperCase()})`);
      }

      // If switching to contractor, automatically navigate to Contractor Dashboard
      if (role === "contractor") {
        switchMainTab("contractorDashboard");
      } else if (role === "admin") {
        switchMainTab("adminPortal");
      } else {
        // If customer, if we were on contractor/admin dash, return to contractors
        if (appState.activeMainTab === "contractorDashboard" || appState.activeMainTab === "adminPortal") {
          switchMainTab("contractors");
        }
      }
    }
  } catch (err) {
    console.error("Error switching user role:", err);
  }
  closeAuthDropdown();
}

function renderPortalSubBar() {
  const titleEl = document.getElementById("portalRoleTitle");
  const tabsEl = document.getElementById("portalActionTabs");
  const user = appState.currentUser;

  if (user.role === "customer") {
    titleEl.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
      <span>Active Customer: <strong>${user.name}</strong></span>
    `;
    tabsEl.innerHTML = `
      <button onclick="switchMainTab('customerPortal'); switchCustomerSubTab('quotes')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold flex items-center gap-1">
        <i class="fa-solid fa-file-invoice-dollar"></i> My Guidance Quotes
      </button>
      <button onclick="switchMainTab('customerPortal'); switchCustomerSubTab('orders')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1">
        <i class="fa-solid fa-bag-shopping"></i> My Orders
      </button>
    `;
  } else if (user.role === "contractor") {
    titleEl.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
      <span>Contractor Mode: <strong>${user.name}</strong></span>
    `;
    tabsEl.innerHTML = `
      <button onclick="switchMainTab('contractorDashboard'); switchContractorSubTab('materials')" class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
        <i class="fa-solid fa-boxes-stacked"></i> Store Inventory
      </button>
      <button onclick="switchMainTab('contractorDashboard'); switchContractorSubTab('guidance')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1">
        <i class="fa-solid fa-comment-dots"></i> Quote Requests
      </button>
      <button onclick="switchMainTab('contractorDashboard'); switchContractorSubTab('orders')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1">
        <i class="fa-solid fa-truck-ramp-box"></i> Order Fulfillment
      </button>
    `;
  } else if (user.role === "admin") {
    titleEl.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
      <span>Super Administrator: <strong>Verification & Approvals Active</strong></span>
    `;
    tabsEl.innerHTML = `
      <button onclick="switchMainTab('adminPortal')" class="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
        <i class="fa-solid fa-shield-halved"></i> Contractor Approvals Queue
      </button>
    `;
  }
}

function toggleAuthDropdown() {
  const dd = document.getElementById("authDropdown");
  dd.classList.toggle("hidden");
}

function closeAuthDropdown() {
  document.getElementById("authDropdown").classList.add("hidden");
}

// ----------------- NAVIGATION TABS -----------------
function switchMainTab(tabName) {
  appState.activeMainTab = tabName;

  // View containers
  const views = [
    "contractors", "materials", "howItWorks", 
    "contractorDashboard", "customerPortal", "adminPortal"
  ];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add("hidden");
  });

  const activeView = document.getElementById(`view-${tabName}`);
  if (activeView) activeView.classList.remove("hidden");

  // Nav styles
  ["contractors", "materials", "howItWorks"].forEach(n => {
    const btn = document.getElementById(`nav-${n}`);
    if (btn) {
      if (n === tabName) {
        btn.className = "px-3 py-2 rounded-lg text-amber-400 bg-slate-800 font-semibold transition";
      } else {
        btn.className = "px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition";
      }
    }
  });

  // Tab specific data loaders
  if (tabName === "contractorDashboard") {
    loadContractorDashboard();
  } else if (tabName === "customerPortal") {
    loadCustomerPortal();
  } else if (tabName === "adminPortal") {
    loadAdminPortal();
  } else if (tabName === "materials") {
    fetchMaterials();
  } else if (tabName === "contractors") {
    fetchContractors();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openCustomerGuidanceTab() {
  switchUserRole("customer", false);
  switchMainTab("customerPortal");
  switchCustomerSubTab("quotes");
}

// ----------------- CONTRACTORS DIRECTORY -----------------
function filterByTrade(trade) {
  document.getElementById("filterTrade").value = trade;
  // Update trade pills UI
  document.querySelectorAll(".trade-pill").forEach(p => {
    p.classList.remove("bg-amber-500", "text-slate-950", "shadow-md");
    p.classList.add("bg-slate-800", "text-slate-200");
  });
  event.currentTarget.classList.remove("bg-slate-800", "text-slate-200");
  event.currentTarget.classList.add("bg-amber-500", "text-slate-950", "shadow-md");
  fetchContractors();
}

function onGlobalCityChange(city) {
  document.getElementById("filterCity").value = city;
  fetchContractors();
  fetchMaterials();
}

function debounceFetchContractors() {
  clearTimeout(appState.searchDebounceTimer);
  appState.searchDebounceTimer = setTimeout(fetchContractors, 300);
}

function resetFilters() {
  document.getElementById("filterSearch").value = "";
  document.getElementById("filterCity").value = "all";
  document.getElementById("filterTrade").value = "all";
  document.querySelector('input[name="minRating"][value="0"]').checked = true;
  fetchContractors();
}

async function fetchContractors() {
  const search = document.getElementById("filterSearch") ? document.getElementById("filterSearch").value : "";
  const city = document.getElementById("filterCity") ? document.getElementById("filterCity").value : "all";
  const trade = document.getElementById("filterTrade") ? document.getElementById("filterTrade").value : "all";
  const minRatingRadio = document.querySelector('input[name="minRating"]:checked');
  const minRating = minRatingRadio ? minRatingRadio.value : 0;

  let url = `${API_BASE}/api/contractors?search=${encodeURIComponent(search)}&city=${encodeURIComponent(city)}&trade=${encodeURIComponent(trade)}&min_rating=${minRating}`;

  try {
    const res = await fetch(url);
    const contractors = await res.json();
    renderContractorsList(contractors);
  } catch (err) {
    console.error("Error fetching contractors:", err);
  }
}

function renderContractorsList(contractors) {
  const grid = document.getElementById("contractorGrid");
  const countEl = document.getElementById("contractorResultCount");

  countEl.textContent = `Showing ${contractors.length} certified contractor${contractors.length === 1 ? '' : 's'}`;

  if (!contractors || contractors.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full bg-white p-10 rounded-2xl text-center border border-slate-200">
        <i class="fa-solid fa-helmet-safety text-4xl text-slate-300 mb-3"></i>
        <h4 class="font-bold text-slate-700">No contractors found matching your criteria</h4>
        <p class="text-xs text-slate-500 mt-1">Try resetting the city or trade filters to view available professionals.</p>
        <button onclick="resetFilters()" class="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = contractors.map(c => `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        <!-- Card Header -->
        <div class="p-5 flex items-start gap-4">
          <img src="${c.photo_url}" alt="${c.name}" class="w-16 h-16 rounded-2xl object-cover border border-slate-200 flex-shrink-0">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="badge-amber text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">${c.trade}</span>
              <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <i class="fa-solid fa-circle-check text-emerald-600"></i> Verified
              </span>
            </div>
            <h3 class="text-base font-bold text-slate-900 mt-1 truncate cursor-pointer hover:text-amber-600" onclick="openContractorModalDetail(${c.id})">${c.name}</h3>
            <p class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <i class="fa-solid fa-location-dot text-amber-500 text-[11px]"></i> ${c.area}, ${c.city}
            </p>
          </div>
        </div>

        <!-- Bio snippet -->
        <div class="px-5 pb-3">
          <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">${c.bio || 'Experienced trade contractor with guaranteed workmanship and authentic building supplies.'}</p>
        </div>

        <!-- Portfolio Previews -->
        ${c.portfolio_previews && c.portfolio_previews.length > 0 ? `
          <div class="px-5 pb-3">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Past Completed Work</span>
            <div class="grid grid-cols-3 gap-2">
              ${c.portfolio_previews.map(p => `
                <div class="relative group rounded-lg overflow-hidden h-14 bg-slate-100">
                  <img src="${p.image_url}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Dual Ratings & Highlights Bar -->
        <div class="px-5 py-3 bg-slate-50 border-t border-b border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span class="text-[10px] text-slate-500 block">Dual Rating</span>
            <div class="flex items-center gap-1 font-bold text-slate-900">
              <span class="text-amber-500 font-extrabold flex items-center"><i class="fa-solid fa-star mr-1"></i> ${c.overall_rating}</span>
              <span class="text-[10px] text-slate-400">(${c.review_count} reviews)</span>
            </div>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 block">Experience</span>
            <span class="font-bold text-slate-900">${c.experience_years} Years</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 block">Materials</span>
            <span class="font-bold text-emerald-600">${c.materials_count} Products</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="p-4 bg-white flex items-center gap-2">
        <button onclick="openContractorModalDetail(${c.id})" class="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow">
          <i class="fa-solid fa-store text-amber-400"></i> View Profile & Materials
        </button>
        <button onclick="openGuidanceModalDirect(${c.id}, '${c.name.replace(/'/g, "\\'")}')" class="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow shadow-amber-500/20" title="Request Quantity & Material Guidance">
          <i class="fa-solid fa-hand-holding-hand"></i> Guidance
        </button>
      </div>
    </div>
  `).join('');
}

// ----------------- CONTRACTOR PROFILE MODAL -----------------
async function openContractorModalDetail(contractorId) {
  try {
    const res = await fetch(`${API_BASE}/api/contractors/${contractorId}`);
    const c = await res.json();
    appState.currentContractorDetail = c;
    appState.activeGuidanceContractor = { id: c.id, name: c.name };

    // Fill Modal Header
    document.getElementById("modalContractorPhoto").src = c.photo_url;
    document.getElementById("modalContractorName").textContent = c.name;
    document.getElementById("modalContractorTrade").textContent = c.trade;
    document.getElementById("modalContractorArea").textContent = `${c.area}, ${c.city}`;
    document.getElementById("modalContractorExp").textContent = `${c.experience_years} Years Experience`;
    document.getElementById("modalContractorCompleted").textContent = `${c.completed_projects} Jobs Completed`;
    document.getElementById("modalContractorPhone").textContent = c.phone;
    document.getElementById("modalRatingMat").innerHTML = `${c.rating_materials} <i class="fa-solid fa-star ml-1 text-[11px]"></i>`;
    document.getElementById("modalRatingWork").innerHTML = `${c.rating_workmanship} <i class="fa-solid fa-star ml-1 text-[11px]"></i>`;

    // Counts on tabs
    document.getElementById("modalMatCount").textContent = c.materials ? c.materials.length : 0;
    document.getElementById("modalPortCount").textContent = c.portfolios ? c.portfolios.length : 0;
    document.getElementById("modalRevCount").textContent = c.reviews ? c.reviews.length : 0;

    // Render Tab 1: Materials Store
    renderModalMaterials(c.materials || [], c);

    // Render Tab 2: Portfolios
    renderModalPortfolios(c.portfolios || []);

    // Render Tab 3: Reviews
    renderModalReviews(c.reviews || []);

    // Open to Materials tab by default
    switchModalTab("materials");

    // Show modal
    document.getElementById("contractorModal").classList.remove("hidden");
  } catch (err) {
    console.error("Error fetching contractor detail:", err);
  }
}

function closeContractorModal() {
  document.getElementById("contractorModal").classList.add("hidden");
}

function switchModalTab(tabName) {
  appState.activeModalTab = tabName;
  ["materials", "portfolio", "reviews"].forEach(t => {
    const content = document.getElementById(`m-content-${t}`);
    const tabBtn = document.getElementById(`m-tab-${t}`);
    if (t === tabName) {
      if (content) content.classList.remove("hidden");
      if (tabBtn) {
        tabBtn.className = "py-3 border-b-2 border-amber-500 text-amber-600";
      }
    } else {
      if (content) content.classList.add("hidden");
      if (tabBtn) {
        tabBtn.className = "py-3 border-b-2 border-transparent hover:text-slate-900";
      }
    }
  });
}

function renderModalMaterials(materials, contractor) {
  const container = document.getElementById("modalMaterialsList");
  if (!materials || materials.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-xs">No materials currently listed by this contractor.</div>`;
    return;
  }

  container.innerHTML = materials.map(m => `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div class="flex items-start justify-between gap-2">
          <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">${m.brand}</span>
          <span class="text-[10px] ${m.is_in_stock ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'} font-bold px-2 py-0.5 rounded-full">
            ${m.is_in_stock ? `${m.stock} in stock` : 'Out of stock'}
          </span>
        </div>
        <h4 class="font-bold text-slate-900 text-xs mt-2">${m.name}</h4>
        <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${m.description || ''}</p>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span class="text-slate-900 font-black text-sm">₹ ${m.price.toLocaleString('en-IN')}</span>
          <span class="text-[10px] text-slate-500 block">/ ${m.unit}</span>
        </div>
        <button onclick="addToCart(${contractor.id}, '${contractor.name.replace(/'/g, "\\'")}', ${m.id}, '${m.name.replace(/'/g, "\\'")}', '${m.unit}', ${m.price})" 
          ${!m.is_in_stock ? 'disabled' : ''} 
          class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl transition shadow">
          <i class="fa-solid fa-plus mr-1"></i> Add to Cart
        </button>
      </div>
    </div>
  `).join('');
}

function renderModalPortfolios(portfolios) {
  const container = document.getElementById("modalPortfolioList");
  if (!portfolios || portfolios.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-xs">No portfolio projects uploaded yet.</div>`;
    return;
  }

  container.innerHTML = portfolios.map(p => `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <img src="${p.image_url}" alt="${p.title}" class="w-full h-44 object-cover">
      <div class="p-4">
        <span class="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded uppercase">${p.category || 'Renovation'}</span>
        <h4 class="font-bold text-slate-900 text-sm mt-1.5">${p.title}</h4>
        <p class="text-xs text-slate-600 mt-1 leading-relaxed">${p.description || ''}</p>
      </div>
    </div>
  `).join('');
}

function renderModalReviews(reviews) {
  const container = document.getElementById("modalReviewsList");
  if (!reviews || reviews.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">No reviews submitted yet. Be the first to order and review!</div>`;
    return;
  }

  container.innerHTML = reviews.map(r => `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs">
            ${r.customer_name ? r.customer_name.charAt(0) : 'C'}
          </div>
          <div>
            <h5 class="font-bold text-slate-900 leading-tight">${r.customer_name}</h5>
            <span class="text-[10px] text-emerald-600 font-semibold"><i class="fa-solid fa-circle-check"></i> Verified Buyer</span>
          </div>
        </div>
        <span class="text-[10px] text-slate-400">${new Date(r.created_at).toLocaleDateString()}</span>
      </div>

      <!-- Dual Score Badges -->
      <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-xl text-[11px]">
        <span class="text-slate-600">Material Quality: <strong class="text-amber-600">${r.material_rating} ★</strong></span>
        <span class="text-slate-300">|</span>
        <span class="text-slate-600">Workmanship & Guidance: <strong class="text-amber-600">${r.workmanship_rating} ★</strong></span>
      </div>

      <p class="text-slate-700 leading-relaxed">${r.comment}</p>
    </div>
  `).join('');
}

// ----------------- MATERIALS STORE VIEW -----------------
function debounceFetchMaterials() {
  clearTimeout(appState.searchDebounceTimer);
  appState.searchDebounceTimer = setTimeout(fetchMaterials, 300);
}

async function fetchMaterials() {
  const search = document.getElementById("matSearch") ? document.getElementById("matSearch").value : "";
  const category = document.getElementById("matCategoryFilter") ? document.getElementById("matCategoryFilter").value : "all";
  const city = document.getElementById("globalCitySelect") ? document.getElementById("globalCitySelect").value : "all";

  try {
    const res = await fetch(`${API_BASE}/api/materials?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`);
    const materials = await res.json();
    renderMaterialsMarket(materials);
  } catch (err) {
    console.error("Error fetching materials:", err);
  }
}

function renderMaterialsMarket(materials) {
  const grid = document.getElementById("materialsGrid");
  if (!materials || materials.length === 0) {
    grid.innerHTML = `<div class="col-span-full bg-white p-12 rounded-2xl text-center border border-slate-200 text-slate-500 text-xs">No materials found in this category or location.</div>`;
    return;
  }

  grid.innerHTML = materials.map(m => `
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div class="h-40 bg-slate-100 relative overflow-hidden">
          <img src="${m.image_url}" alt="${m.name}" class="w-full h-full object-cover">
          <span class="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
            ${m.brand}
          </span>
          <span class="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-lg">
            ${m.stock} In Stock
          </span>
        </div>

        <div class="p-4 space-y-2">
          <div class="flex items-center justify-between text-[11px] text-slate-500">
            <span class="font-semibold text-amber-600">${m.category}</span>
            <span><i class="fa-solid fa-location-dot"></i> ${m.contractor_city}</span>
          </div>

          <h3 class="font-bold text-slate-900 text-xs line-clamp-2">${m.name}</h3>

          <div class="bg-slate-50 p-2 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
            <span>Sold by: <strong>${m.contractor_name}</strong></span>
            <span class="text-amber-500 font-bold">${m.contractor_mat_rating} ★</span>
          </div>
        </div>
      </div>

      <div class="p-4 pt-0 flex items-center justify-between">
        <div>
          <span class="text-slate-900 font-black text-sm">₹ ${m.price.toLocaleString('en-IN')}</span>
          <span class="text-[10px] text-slate-500 block">/ ${m.unit}</span>
        </div>
        <button onclick="addToCart(${m.contractor_id}, '${m.contractor_name.replace(/'/g, "\\'")}', ${m.id}, '${m.name.replace(/'/g, "\\'")}', '${m.unit}', ${m.price})" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow">
          <i class="fa-solid fa-cart-plus mr-1"></i> Add
        </button>
      </div>
    </div>
  `).join('');
}

// ----------------- GUIDANCE REQUEST WORKFLOW -----------------
function openGuidanceModalDirect(contractorId, contractorName) {
  appState.activeGuidanceContractor = { id: contractorId, name: contractorName };
  document.getElementById("guidanceContractorName").textContent = contractorName;
  document.getElementById("guidanceModal").classList.remove("hidden");
}

function openGuidanceModalFromContractor() {
  if (appState.currentContractorDetail) {
    openGuidanceModalDirect(appState.currentContractorDetail.id, appState.currentContractorDetail.name);
  }
}

function closeGuidanceModal() {
  document.getElementById("guidanceModal").classList.add("hidden");
}

async function submitGuidanceRequest(e) {
  e.preventDefault();
  const customerId = appState.currentUser.id;
  const contractorId = appState.activeGuidanceContractor.id;
  const title = document.getElementById("gProjectTitle").value;
  const details = document.getElementById("gProjectDetails").value;
  const brand = document.getElementById("gPreferredBrand").value;

  try {
    const res = await fetch(`${API_BASE}/api/guidance/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        contractor_id: contractorId,
        project_title: title,
        project_details: details,
        preferred_brand: brand
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Guidance request submitted! The contractor will reply with quotes and advice.");
      closeGuidanceModal();
      document.getElementById("guidanceForm").reset();

      // Take user to their Customer Portal to view tracking
      switchMainTab("customerPortal");
      switchCustomerSubTab("quotes");
    }
  } catch (err) {
    console.error("Error creating guidance request:", err);
  }
}

// ----------------- CART & CHECKOUT -----------------
function addToCart(contractorId, contractorName, materialId, name, unit, price) {
  const existing = appState.cart.find(it => it.materialId === materialId);
  if (existing) {
    existing.qty += 1;
  } else {
    appState.cart.push({
      contractorId,
      contractorName,
      materialId,
      name,
      unit,
      price,
      qty: 1
    });
  }
  updateCartBadge();
  showToast(`Added 1x ${name} to cart`);
}

function updateCartBadge() {
  const totalItems = appState.cart.reduce((acc, it) => acc + it.qty, 0);
  document.getElementById("cartCountBadge").textContent = totalItems;
}

function toggleCartModal(open) {
  const modal = document.getElementById("cartModal");
  if (open) {
    renderCartDrawer();
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
}

function renderCartDrawer() {
  const list = document.getElementById("cartItemsList");
  if (appState.cart.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16 space-y-2 text-slate-400">
        <i class="fa-solid fa-cart-shopping text-3xl"></i>
        <p class="font-bold text-slate-600">Your cart is empty</p>
        <p class="text-[11px]">Add materials from any contractor's profile to order directly.</p>
      </div>
    `;
    updateCartTotals(0);
    return;
  }

  let subtotal = 0;
  list.innerHTML = appState.cart.map((it, idx) => {
    const lineTotal = it.price * it.qty;
    subtotal += lineTotal;
    return `
      <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
        <div class="flex-1 pr-2">
          <h5 class="font-bold text-slate-900 leading-tight">${it.name}</h5>
          <span class="text-[10px] text-slate-500 block">Sold by: ${it.contractorName}</span>
          <span class="text-[11px] font-bold text-amber-600">₹ ${it.price.toLocaleString('en-IN')} / ${it.unit}</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
            <button onclick="changeCartQty(${idx}, -1)" class="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold">-</button>
            <span class="px-2 text-slate-800 font-bold text-xs">${it.qty}</span>
            <button onclick="changeCartQty(${idx}, 1)" class="px-2 py-1 text-slate-600 hover:bg-slate-100 font-bold">+</button>
          </div>
          <button onclick="removeCartItem(${idx})" class="text-slate-400 hover:text-rose-500 p-1">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  updateCartTotals(subtotal);
}

function changeCartQty(idx, delta) {
  appState.cart[idx].qty += delta;
  if (appState.cart[idx].qty <= 0) {
    appState.cart.splice(idx, 1);
  }
  updateCartBadge();
  renderCartDrawer();
}

function removeCartItem(idx) {
  appState.cart.splice(idx, 1);
  updateCartBadge();
  renderCartDrawer();
}

function selectFulfillment(type) {
  appState.fulfillmentMethod = type;
  const btnDoorstep = document.getElementById("btnFulfillDoorstep");
  const btnPickup = document.getElementById("btnFulfillPickup");
  const addrSection = document.getElementById("deliveryAddressSection");

  if (type === "doorstep") {
    appState.deliveryFee = 150;
    btnDoorstep.className = "p-2.5 rounded-xl border border-amber-500 bg-amber-50 text-amber-900 font-bold text-center";
    btnPickup.className = "p-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-center";
    addrSection.classList.remove("hidden");
  } else {
    appState.deliveryFee = 0;
    btnPickup.className = "p-2.5 rounded-xl border border-amber-500 bg-amber-50 text-amber-900 font-bold text-center";
    btnDoorstep.className = "p-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-center";
    addrSection.classList.add("hidden");
  }

  // Recalculate totals
  const subtotal = appState.cart.reduce((acc, it) => acc + (it.price * it.qty), 0);
  updateCartTotals(subtotal);
}

function updateCartTotals(subtotal) {
  const fee = appState.deliveryFee;
  const total = subtotal + (subtotal > 0 ? fee : 0);

  document.getElementById("cartSubtotal").textContent = `₹ ${subtotal.toLocaleString('en-IN')}`;
  document.getElementById("cartDeliveryFee").textContent = subtotal > 0 ? `₹ ${fee.toLocaleString('en-IN')}` : '₹ 0';
  document.getElementById("cartTotalPayable").textContent = `₹ ${total.toLocaleString('en-IN')}`;
}

async function submitCartOrder() {
  if (appState.cart.length === 0) {
    showToast("Your cart is empty!", false);
    return;
  }

  const subtotal = appState.cart.reduce((acc, it) => acc + (it.price * it.qty), 0);
  const total = subtotal + appState.deliveryFee;
  const contractorId = appState.cart[0].contractorId;
  const paymentMethod = document.querySelector('input[name="checkoutPayment"]:checked').value;
  const address = document.getElementById("checkoutAddress").value;
  const phone = document.getElementById("checkoutPhone").value;

  const items = appState.cart.map(it => ({
    material_id: it.materialId,
    name: it.name,
    unit: it.unit,
    qty: it.qty,
    price: it.price,
    total: it.price * it.qty
  }));

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: appState.currentUser.id,
        contractor_id: contractorId,
        items: items,
        subtotal: subtotal,
        delivery_fee: appState.deliveryFee,
        total_amount: total,
        fulfillment_method: appState.fulfillmentMethod,
        delivery_address: address,
        contact_phone: phone,
        payment_method: paymentMethod
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Success! Order #${data.order_code} confirmed.`);
      appState.cart = [];
      updateCartBadge();
      toggleCartModal(false);

      // Navigate to Customer Portal Orders
      switchMainTab("customerPortal");
      switchCustomerSubTab("orders");
    }
  } catch (err) {
    console.error("Error submitting order:", err);
  }
}

// ----------------- CUSTOMER PORTAL -----------------
function switchCustomerSubTab(tabName) {
  appState.activeCustomerSubTab = tabName;
  const quotesEl = document.getElementById("c-sub-quotes");
  const ordersEl = document.getElementById("c-sub-orders");
  const tabQuotesBtn = document.getElementById("cust-tab-quotes");
  const tabOrdersBtn = document.getElementById("cust-tab-orders");

  if (tabName === "quotes") {
    quotesEl.classList.remove("hidden");
    ordersEl.classList.add("hidden");
    tabQuotesBtn.className = "pb-3 border-b-2 border-amber-500 text-amber-600";
    tabOrdersBtn.className = "pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800";
    loadCustomerGuidanceQuotes();
  } else {
    quotesEl.classList.add("hidden");
    ordersEl.classList.remove("hidden");
    tabOrdersBtn.className = "pb-3 border-b-2 border-amber-500 text-amber-600";
    tabQuotesBtn.className = "pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800";
    loadCustomerOrders();
  }
}

async function loadCustomerPortal() {
  switchCustomerSubTab(appState.activeCustomerSubTab);
}

async function loadCustomerGuidanceQuotes() {
  try {
    const res = await fetch(`${API_BASE}/api/guidance/customer/${appState.currentUser.id}`);
    const quotes = await res.json();
    document.getElementById("custQuotesBadge").textContent = quotes.length;
    renderCustomerQuotes(quotes);
  } catch (err) {
    console.error("Error loading customer quotes:", err);
  }
}

function renderCustomerQuotes(quotes) {
  const container = document.getElementById("customerQuotesList");
  if (!quotes || quotes.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-10 rounded-2xl text-center border border-slate-200 text-slate-500 text-xs">
        <i class="fa-solid fa-clipboard-question text-3xl text-slate-300 mb-2"></i>
        <p class="font-bold text-slate-700">No Guidance Inquiries Yet</p>
        <p class="mt-1">Browse any contractor and click <strong>"Request Guidance"</strong> to receive personalized quantity estimates.</p>
        <button onclick="switchMainTab('contractors')" class="mt-3 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl">Browse Contractors</button>
      </div>
    `;
    return;
  }

  container.innerHTML = quotes.map(q => `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span class="text-[10px] ${q.status === 'quoted' ? 'bg-amber-100 text-amber-800 border-amber-300' : (q.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600')} px-2 py-0.5 rounded-full font-bold border uppercase">
            ${q.status.toUpperCase()}
          </span>
          <h3 class="font-bold text-slate-900 text-sm mt-1">${q.project_title}</h3>
          <span class="text-[11px] text-slate-500">Contractor: <strong>${q.contractor_name}</strong> (${q.contractor_trade})</span>
        </div>
        <span class="text-[11px] text-slate-400">${new Date(q.created_at).toLocaleDateString()}</span>
      </div>

      <!-- Specs submitted -->
      <div class="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 space-y-1">
        <span class="font-bold text-slate-800 block">Your Submitted Specs:</span>
        <p class="text-slate-600">${q.project_details}</p>
        ${q.preferred_brand ? `<span class="text-[10px] text-amber-700 font-semibold">Preferred Brand: ${q.preferred_brand}</span>` : ''}
      </div>

      <!-- Contractor advice & quote if available -->
      ${q.status === 'quoted' || q.status === 'accepted' ? `
        <div class="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl space-y-3">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-comments text-amber-600 text-sm"></i>
            <h4 class="font-bold text-slate-900 text-xs">Contractor Advice & Recommended Products</h4>
          </div>
          <p class="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-amber-100">${q.contractor_notes}</p>

          <!-- Recommended items table -->
          <div class="bg-white rounded-xl border border-amber-100 overflow-hidden text-xs">
            <table class="w-full text-left">
              <thead class="bg-amber-100/50 text-slate-700 font-bold text-[10px] uppercase">
                <tr>
                  <th class="p-2.5">Recommended Product</th>
                  <th class="p-2.5">Quantity & Unit</th>
                  <th class="p-2.5">Unit Price</th>
                  <th class="p-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${q.quote_items.map(it => `
                  <tr>
                    <td class="p-2.5 font-semibold text-slate-800">${it.name}</td>
                    <td class="p-2.5 text-slate-600">${it.qty} x ${it.unit}</td>
                    <td class="p-2.5 text-slate-600">₹ ${it.price.toLocaleString('en-IN')}</td>
                    <td class="p-2.5 text-right font-bold text-slate-900">₹ ${(it.price * it.qty).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between pt-2">
            <div>
              <span class="text-xs text-slate-500">Total Quote:</span>
              <span class="text-base font-black text-slate-900 ml-1">₹ ${q.quote_total.toLocaleString('en-IN')}</span>
            </div>
            ${q.status === 'quoted' ? `
              <button onclick="approveQuoteAndOrder(${q.id}, ${q.contractor_id}, ${JSON.stringify(q.quote_items).replace(/"/g, '&quot;')}, ${q.quote_total})" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow shadow-emerald-600/30 flex items-center gap-1.5">
                <i class="fa-solid fa-circle-check"></i> Approve Quote & Place Order
              </button>
            ` : `
              <span class="badge-emerald text-xs px-3 py-1 rounded-full font-bold">Order Confirmed</span>
            `}
          </div>
        </div>
      ` : `
        <div class="p-4 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center gap-2">
          <i class="fa-solid fa-hourglass-half text-amber-500 animate-spin"></i>
          <span>The contractor is inspecting your specifications and calculating recommended quantities. Check back shortly!</span>
        </div>
      `}
    </div>
  `).join('');
}

async function approveQuoteAndOrder(guidanceId, contractorId, items, total) {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: appState.currentUser.id,
        contractor_id: contractorId,
        items: items,
        subtotal: total,
        delivery_fee: 150,
        total_amount: total + 150,
        fulfillment_method: "doorstep",
        delivery_address: "Customer Address on File (Indiranagar, Bangalore)",
        contact_phone: appState.currentUser.phone,
        payment_method: "cod",
        guidance_request_id: guidanceId
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Quote Approved! Order #${data.order_code} placed.`);
      switchCustomerSubTab("orders");
    }
  } catch (err) {
    console.error("Error approving quote:", err);
  }
}

async function loadCustomerOrders() {
  try {
    const res = await fetch(`${API_BASE}/api/orders/customer/${appState.currentUser.id}`);
    const orders = await res.json();
    document.getElementById("custOrdersBadge").textContent = orders.length;
    renderCustomerOrders(orders);
  } catch (err) {
    console.error("Error loading customer orders:", err);
  }
}

function renderCustomerOrders(orders) {
  const container = document.getElementById("customerOrdersList");
  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-10 rounded-2xl text-center border border-slate-200 text-slate-500 text-xs">
        <i class="fa-solid fa-box-open text-3xl text-slate-300 mb-2"></i>
        <p class="font-bold text-slate-700">No Orders Placed Yet</p>
        <p class="mt-1">Add materials to your cart or approve contractor guidance quotes to start receiving building supplies.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-black text-slate-900 text-sm">${o.order_code}</span>
            <span class="badge-blue font-bold px-2 py-0.5 rounded text-[10px] uppercase">${o.status}</span>
            <span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">${o.payment_method.toUpperCase()} (${o.payment_status})</span>
          </div>
          <p class="text-[11px] text-slate-500 mt-0.5">Contractor: <strong>${o.contractor_name}</strong> (${o.contractor_trade})</p>
        </div>
        <div class="text-right">
          <span class="text-sm font-black text-slate-900">₹ ${o.total_amount.toLocaleString('en-IN')}</span>
          <span class="text-[10px] text-slate-400 block">${new Date(o.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <!-- Items Summary -->
      <div class="space-y-1">
        <span class="text-[11px] font-bold text-slate-500 uppercase">Ordered Supplies:</span>
        <div class="space-y-1">
          ${o.items.map(it => `
            <div class="flex justify-between text-slate-700 bg-slate-50 p-2 rounded-lg">
              <span>${it.qty} x ${it.name} (${it.unit})</span>
              <span class="font-bold">₹ ${(it.price * it.qty).toLocaleString('en-IN')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Review Action -->
      <div class="pt-2 border-t flex items-center justify-between">
        <span class="text-[11px] text-slate-500">Delivery via: <strong>${o.fulfillment_method === 'doorstep' ? 'Doorstep Delivery' : 'Site / Warehouse Pickup'}</strong></span>
        ${o.has_reviewed ? `
          <span class="text-emerald-600 font-bold text-xs flex items-center gap-1">
            <i class="fa-solid fa-circle-check"></i> Dual Review Submitted
          </span>
        ` : `
          <button onclick="openReviewModal(${o.id}, ${o.contractor_id}, '${o.contractor_name.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow">
            <i class="fa-solid fa-star mr-1"></i> Write Dual Review
          </button>
        `}
      </div>
    </div>
  `).join('');
}

// ----------------- DUAL REVIEW WORKFLOW -----------------
function openReviewModal(orderId, contractorId, contractorName) {
  document.getElementById("revOrderId").value = orderId;
  document.getElementById("revContractorId").value = contractorId;
  document.getElementById("reviewModal").classList.remove("hidden");
}

function closeReviewModal() {
  document.getElementById("reviewModal").classList.add("hidden");
}

async function submitReview(e) {
  e.preventDefault();
  const orderId = document.getElementById("revOrderId").value;
  const contractorId = document.getElementById("revContractorId").value;
  const matRating = parseFloat(document.getElementById("revMatRating").value);
  const workRating = parseFloat(document.getElementById("revWorkRating").value);
  const comment = document.getElementById("revComment").value;

  try {
    const res = await fetch(`${API_BASE}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: parseInt(orderId),
        contractor_id: parseInt(contractorId),
        customer_id: appState.currentUser.id,
        customer_name: appState.currentUser.name,
        material_rating: matRating,
        workmanship_rating: workRating,
        comment: comment
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Verified Dual Review submitted successfully!");
      closeReviewModal();
      document.getElementById("reviewForm").reset();
      loadCustomerOrders();
      fetchContractors(); // Refresh ratings
    }
  } catch (err) {
    console.error("Error submitting review:", err);
  }
}

// ----------------- CONTRACTOR DASHBOARD -----------------
function switchContractorSubTab(subTab) {
  appState.activeContractorSubTab = subTab;
  ["materials", "guidance", "orders"].forEach(st => {
    const content = document.getElementById(`c-subtab-${st}`);
    const btn = document.getElementById(`subtab-${st}`);
    if (st === subTab) {
      if (content) content.classList.remove("hidden");
      if (btn) btn.className = "pb-3 border-b-2 border-amber-500 text-amber-600";
    } else {
      if (content) content.classList.add("hidden");
      if (btn) btn.className = "pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800";
    }
  });

  if (subTab === "materials") loadContractorMaterials();
  else if (subTab === "guidance") loadContractorGuidance();
  else if (subTab === "orders") loadContractorOrders();
}

async function loadContractorDashboard() {
  const contractorId = 1; // Demo: Vikram ColourCraft Painters
  switchContractorSubTab(appState.activeContractorSubTab);
}

async function loadContractorMaterials() {
  const contractorId = 1; // Vikram
  try {
    const res = await fetch(`${API_BASE}/api/contractors/${contractorId}`);
    const c = await res.json();
    document.getElementById("dashMatCount").textContent = c.materials.length;
    document.getElementById("countSubMat").textContent = c.materials.length;
    renderContractorMaterialsTable(c.materials);
  } catch (err) {
    console.error("Error loading contractor materials:", err);
  }
}

function renderContractorMaterialsTable(materials) {
  const tbody = document.getElementById("contractorMaterialsTable");
  if (!materials || materials.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400">No materials currently in store. Click "Add Material" above.</td></tr>`;
    return;
  }

  tbody.innerHTML = materials.map(m => `
    <tr class="hover:bg-slate-50">
      <td class="p-3.5">
        <div class="font-bold text-slate-900">${m.name}</div>
        <div class="text-[10px] text-slate-500">${m.brand}</div>
      </td>
      <td class="p-3.5 font-semibold text-slate-600">${m.category}</td>
      <td class="p-3.5 font-bold text-slate-900">
        ₹ <input type="number" value="${m.price}" onchange="updateMaterialPrice(${m.id}, this.value)" class="w-20 bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-xs text-slate-900 font-bold">
      </td>
      <td class="p-3.5 text-slate-600">${m.unit}</td>
      <td class="p-3.5">
        <input type="number" value="${m.stock}" onchange="updateMaterialStock(${m.id}, this.value)" class="w-16 bg-slate-100 border border-slate-300 rounded px-1 py-0.5 text-xs text-slate-900 font-bold">
      </td>
      <td class="p-3.5">
        <button onclick="toggleMaterialStockStatus(${m.id}, ${m.is_in_stock ? 0 : 1})" class="px-2 py-1 rounded text-[10px] font-bold ${m.is_in_stock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
          ${m.is_in_stock ? 'In Stock' : 'Out of Stock'}
        </button>
      </td>
      <td class="p-3.5 text-right">
        <button onclick="deleteMaterial(${m.id})" class="text-rose-500 hover:text-rose-700 p-1 font-semibold" title="Delete product">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

async function updateMaterialPrice(id, newPrice) {
  try {
    await fetch(`${API_BASE}/api/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: parseFloat(newPrice) })
    });
    showToast("Price updated successfully!");
  } catch (err) {
    console.error("Error updating price:", err);
  }
}

async function updateMaterialStock(id, newStock) {
  try {
    await fetch(`${API_BASE}/api/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: parseInt(newStock) })
    });
    showToast("Stock quantity updated!");
  } catch (err) {
    console.error("Error updating stock:", err);
  }
}

async function toggleMaterialStockStatus(id, newStatus) {
  try {
    await fetch(`${API_BASE}/api/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_in_stock: newStatus })
    });
    loadContractorMaterials();
    showToast("Product availability updated!");
  } catch (err) {
    console.error("Error toggling stock status:", err);
  }
}

async function deleteMaterial(id) {
  if (!confirm("Are you sure you want to remove this item from your store?")) return;
  try {
    await fetch(`${API_BASE}/api/materials/${id}`, { method: "DELETE" });
    showToast("Item deleted.");
    loadContractorMaterials();
  } catch (err) {
    console.error("Error deleting material:", err);
  }
}

// Add Material Modal
function openAddMaterialModal() {
  document.getElementById("addMaterialModal").classList.remove("hidden");
}

function closeAddMaterialModal() {
  document.getElementById("addMaterialModal").classList.add("hidden");
}

async function submitNewMaterial(e) {
  e.preventDefault();
  const contractorId = 1; // Vikram
  const name = document.getElementById("newMatName").value;
  const brand = document.getElementById("newMatBrand").value;
  const cat = document.getElementById("newMatCategory").value;
  const price = parseFloat(document.getElementById("newMatPrice").value);
  const unit = document.getElementById("newMatUnit").value;
  const stock = parseInt(document.getElementById("newMatStock").value);
  const desc = document.getElementById("newMatDesc").value;

  try {
    const res = await fetch(`${API_BASE}/api/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractor_id: contractorId,
        name: name,
        brand: brand,
        category: cat,
        price: price,
        unit: unit,
        stock: stock,
        description: desc
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Material listed in your store!");
      closeAddMaterialModal();
      document.getElementById("addMaterialForm").reset();
      loadContractorMaterials();
      fetchMaterials();
    }
  } catch (err) {
    console.error("Error adding material:", err);
  }
}

// Contractor Guidance Management
async function loadContractorGuidance() {
  const contractorId = 1;
  try {
    const res = await fetch(`${API_BASE}/api/guidance/contractor/${contractorId}`);
    const requests = await res.json();
    document.getElementById("dashGuidanceCount").textContent = requests.filter(r => r.status === 'pending').length;
    document.getElementById("countSubGuidance").textContent = requests.length;
    renderContractorGuidanceList(requests);
  } catch (err) {
    console.error("Error loading contractor guidance requests:", err);
  }
}

function renderContractorGuidanceList(requests) {
  const container = document.getElementById("contractorGuidanceList");
  if (!requests || requests.length === 0) {
    container.innerHTML = `<div class="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs border border-slate-200">No customer inquiries yet.</div>`;
    return;
  }

  container.innerHTML = requests.map(r => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <span class="font-bold text-slate-900 text-sm">${r.project_title}</span>
          <div class="text-[11px] text-slate-500 mt-0.5">From: <strong>${r.customer_name}</strong> (${r.customer_phone})</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge-amber text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">${r.status}</span>
          <span class="text-[10px] text-slate-400">${new Date(r.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div class="bg-slate-50 p-3 rounded-xl">
        <span class="font-bold text-slate-700 block mb-1">Customer Job Specifications:</span>
        <p class="text-slate-600">${r.project_details}</p>
        ${r.preferred_brand ? `<span class="text-[10px] text-amber-700 font-bold block mt-1">Requested Brand: ${r.preferred_brand}</span>` : ''}
      </div>

      ${r.status === 'pending' ? `
        <div class="flex justify-end">
          <button onclick="openQuoteBuilderModal(${r.id}, '${r.project_title.replace(/'/g, "\\'")}', '${r.project_details.replace(/'/g, "\\'")}')" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow">
            <i class="fa-solid fa-file-signature mr-1"></i> Build & Send Quote
          </button>
        </div>
      ` : `
        <div class="bg-amber-50 p-3 rounded-xl border border-amber-100 space-y-1">
          <span class="font-bold text-amber-900">Your Sent Advice:</span>
          <p class="text-slate-700">${r.contractor_notes}</p>
          <span class="font-black text-slate-900 block pt-1">Quoted Total: ₹ ${r.quote_total.toLocaleString('en-IN')}</span>
        </div>
      `}
    </div>
  `).join('');
}

// Quote Builder Modal
function openQuoteBuilderModal(reqId, title, details) {
  appState.activeQuoteRequest = { id: reqId, title, details };
  document.getElementById("quoteReqTitle").textContent = title;
  document.getElementById("quoteReqDetails").textContent = details;
  
  // Pre-fill 2 sample quote items
  const container = document.getElementById("quoteItemsContainer");
  container.innerHTML = `
    <div class="quote-item-row grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
      <input type="text" placeholder="Material Name" value="Asian Paints Royale Luxury Emulsion" class="col-span-5 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-name">
      <input type="text" placeholder="Unit (20L)" value="20L Bucket" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-unit">
      <input type="number" placeholder="Qty" value="2" oninput="calcQuoteTotal()" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-qty font-bold">
      <input type="number" placeholder="Price" value="5850" oninput="calcQuoteTotal()" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-price font-bold">
      <button type="button" onclick="this.parentElement.remove(); calcQuoteTotal()" class="col-span-1 text-rose-500"><i class="fa-solid fa-trash"></i></button>
    </div>
    <div class="quote-item-row grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
      <input type="text" placeholder="Material Name" value="Birla White WallSeal Waterproof Putty" class="col-span-5 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-name">
      <input type="text" placeholder="Unit (40kg)" value="40kg Bag" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-unit">
      <input type="number" placeholder="Qty" value="3" oninput="calcQuoteTotal()" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-qty font-bold">
      <input type="number" placeholder="Price" value="980" oninput="calcQuoteTotal()" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-price font-bold">
      <button type="button" onclick="this.parentElement.remove(); calcQuoteTotal()" class="col-span-1 text-rose-500"><i class="fa-solid fa-trash"></i></button>
    </div>
  `;

  calcQuoteTotal();
  document.getElementById("quoteModal").classList.remove("hidden");
}

function closeQuoteModal() {
  document.getElementById("quoteModal").classList.add("hidden");
}

function addQuoteItemRow() {
  const container = document.getElementById("quoteItemsContainer");
  const div = document.createElement("div");
  div.className = "quote-item-row grid grid-cols-12 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200";
  div.innerHTML = `
    <input type="text" placeholder="Material Name" class="col-span-5 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-name">
    <input type="text" placeholder="Unit" value="Piece" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-unit">
    <input type="number" placeholder="Qty" value="1" oninput="calcQuoteTotal()" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-qty font-bold">
    <input type="number" placeholder="Price" value="500" oninput="calcQuoteTotal()" class="col-span-2 bg-white border border-slate-300 rounded px-2 py-1 text-xs q-price font-bold">
    <button type="button" onclick="this.parentElement.remove(); calcQuoteTotal()" class="col-span-1 text-rose-500"><i class="fa-solid fa-trash"></i></button>
  `;
  container.appendChild(div);
  calcQuoteTotal();
}

function calcQuoteTotal() {
  let total = 0;
  document.querySelectorAll(".quote-item-row").forEach(row => {
    const qty = parseFloat(row.querySelector(".q-qty").value) || 0;
    const price = parseFloat(row.querySelector(".q-price").value) || 0;
    total += (qty * price);
  });
  document.getElementById("quoteRunningTotal").textContent = `₹ ${total.toLocaleString('en-IN')}`;
}

async function submitQuoteToCustomer(e) {
  e.preventDefault();
  const notes = document.getElementById("quoteNotes").value;
  const items = [];
  let total = 0;

  document.querySelectorAll(".quote-item-row").forEach(row => {
    const name = row.querySelector(".q-name").value;
    const unit = row.querySelector(".q-unit").value;
    const qty = parseFloat(row.querySelector(".q-qty").value) || 0;
    const price = parseFloat(row.querySelector(".q-price").value) || 0;
    if (name) {
      items.push({ name, unit, qty, price, total: qty * price });
      total += (qty * price);
    }
  });

  try {
    const res = await fetch(`${API_BASE}/api/guidance/${appState.activeQuoteRequest.id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractor_notes: notes,
        quote_items: items,
        quote_total: total
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Guidance quote sent to customer!");
      closeQuoteModal();
      loadContractorGuidance();
    }
  } catch (err) {
    console.error("Error submitting quote:", err);
  }
}

// Contractor Orders Management
async function loadContractorOrders() {
  const contractorId = 1;
  try {
    const res = await fetch(`${API_BASE}/api/orders/contractor/${contractorId}`);
    const orders = await res.json();
    document.getElementById("countSubOrders").textContent = orders.length;
    renderContractorOrdersList(orders);
  } catch (err) {
    console.error("Error loading contractor orders:", err);
  }
}

function renderContractorOrdersList(orders) {
  const container = document.getElementById("contractorOrdersList");
  if (!orders || orders.length === 0) {
    container.innerHTML = `<div class="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs border border-slate-200">No orders received yet.</div>`;
    return;
  }

  container.innerHTML = orders.map(o => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <span class="font-black text-slate-900 text-sm">${o.order_code}</span>
          <div class="text-[11px] text-slate-500 mt-0.5">Customer: <strong>${o.customer_name}</strong> (${o.customer_phone})</div>
        </div>
        <div class="flex items-center gap-3">
          <select onchange="updateOrderStatus(${o.id}, this.value)" class="bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800">
            <option value="placed" ${o.status === 'placed' ? 'selected' : ''}>Placed</option>
            <option value="preparing" ${o.status === 'preparing' ? 'selected' : ''}>Preparing Supplies</option>
            <option value="dispatched" ${o.status === 'dispatched' ? 'selected' : ''}>Dispatched / Out for Delivery</option>
            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Delivered & Completed</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <span class="font-black text-slate-900">₹ ${o.total_amount.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div class="space-y-1">
        <span class="text-[10px] text-slate-400 uppercase font-bold">Items to Fulfill:</span>
        ${o.items.map(it => `
          <div class="flex justify-between bg-slate-50 p-2 rounded-lg text-slate-700">
            <span>${it.qty} x ${it.name} (${it.unit})</span>
            <span class="font-bold">₹ ${(it.price * it.qty).toLocaleString('en-IN')}</span>
          </div>
        `).join('')}
      </div>

      <div class="text-[11px] text-slate-500 bg-amber-50/50 p-2.5 rounded-xl flex items-center justify-between">
        <span>Delivery: <strong>${o.delivery_address || 'Customer store pickup'}</strong></span>
        <span>Payment: <strong>${o.payment_method.toUpperCase()} (${o.payment_status})</strong></span>
      </div>
    </div>
  `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await fetch(`${API_BASE}/api/orders/${orderId}/status?status=${newStatus}`, { method: "PATCH" });
    showToast(`Order status updated to: ${newStatus.toUpperCase()}`);
    loadContractorOrders();
  } catch (err) {
    console.error("Error updating order status:", err);
  }
}

// ----------------- ADMIN PORTAL -----------------
async function loadAdminPortal() {
  try {
    const [statsRes, contractorsRes] = await Promise.all([
      fetch(`${API_BASE}/api/admin/stats`),
      fetch(`${API_BASE}/api/contractors?all_status=true`)
    ]);
    const stats = await statsRes.json();
    const contractors = await contractorsRes.json();

    document.getElementById("adminGmv").textContent = `₹ ${stats.total_gmv.toLocaleString('en-IN')}`;
    document.getElementById("adminContractorsCount").textContent = stats.total_contractors;
    document.getElementById("adminPendingCount").textContent = stats.pending_approvals;
    document.getElementById("adminMaterialsCount").textContent = stats.total_materials;

    renderAdminContractorsTable(contractors);
  } catch (err) {
    console.error("Error loading admin portal:", err);
  }
}

function renderAdminContractorsTable(contractors) {
  const tbody = document.getElementById("adminContractorsTable");
  tbody.innerHTML = contractors.map(c => `
    <tr class="hover:bg-slate-50">
      <td class="p-3.5">
        <div class="font-bold text-slate-900">${c.name}</div>
        <div class="text-[10px] text-slate-500">${c.bio ? c.bio.substring(0, 50) + '...' : ''}</div>
      </td>
      <td class="p-3.5 font-semibold text-slate-700">${c.trade}</td>
      <td class="p-3.5 text-slate-600">${c.city}</td>
      <td class="p-3.5 text-slate-600">${c.experience_years} Yrs</td>
      <td class="p-3.5 text-slate-600">${c.phone}</td>
      <td class="p-3.5">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${c.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
          ${c.is_approved ? 'Verified & Public' : 'Pending Verification'}
        </span>
      </td>
      <td class="p-3.5 text-right">
        <button onclick="toggleContractorApproval(${c.id}, ${c.is_approved ? 0 : 1})" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${c.is_approved ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-600/30'}">
          ${c.is_approved ? 'Revoke Approval' : 'Approve & Verify'}
        </button>
      </td>
    </tr>
  `).join('');
}

async function toggleContractorApproval(id, newApproval) {
  try {
    await fetch(`${API_BASE}/api/admin/contractors/${id}/approval?approve=${newApproval}`, { method: "PATCH" });
    showToast(newApproval ? "Contractor approved and published to marketplace!" : "Contractor listing unverified.");
    loadAdminPortal();
    fetchContractors();
  } catch (err) {
    console.error("Error toggling approval:", err);
  }
}

// ----------------- PHONE OTP LOGIN MODAL -----------------
function openOtpModal() {
  closeAuthDropdown();
  document.getElementById("otpModal").classList.remove("hidden");
  document.getElementById("otpInputSection").classList.add("hidden");
  document.getElementById("btnRequestOtp").classList.remove("hidden");
  document.getElementById("btnVerifyOtp").classList.add("hidden");
}

function closeOtpModal() {
  document.getElementById("otpModal").classList.add("hidden");
}

async function handleRequestOtp() {
  const phone = document.getElementById("otpPhoneInput").value;
  if (!phone || phone.length < 10) {
    showToast("Please enter a valid 10-digit mobile number", false);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/otp-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      document.getElementById("otpInputSection").classList.remove("hidden");
      document.getElementById("btnRequestOtp").classList.add("hidden");
      document.getElementById("btnVerifyOtp").classList.remove("hidden");
      document.getElementById("otpCodeInput").value = data.demo_otp;
    }
  } catch (err) {
    console.error("Error requesting OTP:", err);
  }
}

async function handleVerifyOtp() {
  const phone = document.getElementById("otpPhoneInput").value;
  const otp = document.getElementById("otpCodeInput").value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/otp-verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Welcome back, ${data.user.name}!`);
      appState.currentUser = data.user;
      document.getElementById("userNameNav").textContent = data.user.name;
      document.getElementById("userRoleNav").textContent = data.user.role;
      closeOtpModal();
      renderPortalSubBar();
      if (data.user.role === "contractor") {
        switchMainTab("contractorDashboard");
      }
    }
  } catch (err) {
    console.error("Error verifying OTP:", err);
  }
}
