/* Marketplace: tìm phòng, render property-card, mở modal chi tiết + đặt lịch */

const locationSelect = document.getElementById("location-select");
const priceInput = document.getElementById("price-input");
const searchForm = document.getElementById("search-form");
const resultsEl = document.getElementById("results");
const emptyStateEl = document.getElementById("empty-state");
const modalEl = document.getElementById("detail-modal");
const detailCardEl = document.getElementById("detail-card");

const PALETTE = ["#ff385c", "#460479", "#92174d", "#0d7377", "#c1440e", "#2b2d42"];

function colorForId(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % PALETTE.length;
  return PALETTE[Math.abs(hash)];
}

function formatPrice(price) {
  return price.toLocaleString("vi-VN") + " đ/tháng";
}

async function initLocations() {
  const { locations } = await Api.listLocations();
  for (const loc of locations) {
    const opt = document.createElement("option");
    opt.value = loc;
    opt.textContent = loc;
    locationSelect.appendChild(opt);
  }
}

function renderRooms(rooms) {
  resultsEl.innerHTML = "";
  if (!rooms.length) {
    emptyStateEl.textContent = "Không tìm thấy phòng phù hợp. Thử khu vực hoặc mức giá khác.";
    emptyStateEl.style.display = "block";
    return;
  }
  emptyStateEl.style.display = "none";

  for (const room of rooms) {
    const card = document.createElement("div");
    card.className = "property-card";
    card.innerHTML = `
      <div class="property-card-photo" style="background:${colorForId(room.id)}">${room.type}</div>
      <div class="property-card-body">
        <div class="property-card-title">
          <span class="text-title-md">${room.location} · ${room.bedrooms} PN</span>
        </div>
        <div class="property-card-meta text-body-sm">${room.amenities.slice(0, 3).join(", ")}</div>
        <div class="property-card-price">${formatPrice(room.price)}</div>
      </div>
    `;
    card.addEventListener("click", () => openDetail(room.id));
    resultsEl.appendChild(card);
  }
}

async function openDetail(roomId) {
  const { ok, data } = await Api.getRoom(roomId);
  if (!ok) {
    alert(data.message || "Không tải được thông tin phòng.");
    return;
  }
  const room = data.data;

  detailCardEl.innerHTML = `
    <button class="close-btn" id="close-modal">✕</button>
    <div class="text-display-md">${formatPrice(room.price)}</div>
    <div class="text-title-sm" style="margin-top:4px">${room.type} · ${room.location} · ${room.bedrooms} phòng ngủ</div>
    <div class="amenity-row">📍 ${room.address}</div>
    <div class="amenity-row">📞 ${room.contact}</div>
    <div class="amenity-row">🛋️ ${room.amenities.join(", ")}</div>

    <form id="booking-form" style="margin-top:16px">
      <label class="field-label">Họ tên</label>
      <input class="text-input" id="booking-name" required />
      <label class="field-label">Ngày xem nhà (dd/mm/yyyy)</label>
      <input class="text-input" id="booking-date" placeholder="20/11/2026" required />
      <label class="field-label">Giờ xem nhà (HH:MM)</label>
      <input class="text-input" id="booking-time" placeholder="14:00" required />
      <button class="button-primary" type="submit">Đặt lịch xem nhà</button>
    </form>
    <div id="booking-feedback"></div>
  `;

  document.getElementById("close-modal").addEventListener("click", closeDetail);

  document.getElementById("booking-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      room_id: room.id,
      customer_name: document.getElementById("booking-name").value.trim(),
      date: document.getElementById("booking-date").value.trim(),
      time: document.getElementById("booking-time").value.trim(),
    };
    const feedbackEl = document.getElementById("booking-feedback");
    const { ok, data: result } = await Api.bookAppointment(payload);
    feedbackEl.className = `form-feedback ${ok ? "success" : "error"}`;
    feedbackEl.textContent = result.message || (ok ? "Đặt lịch thành công!" : "Đặt lịch thất bại.");
  });

  modalEl.classList.add("open");
}

function closeDetail() {
  modalEl.classList.remove("open");
}

modalEl.addEventListener("click", (e) => {
  if (e.target === modalEl) closeDetail();
});

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const location = locationSelect.value;
  const maxPrice = priceInput.value;
  if (!location || !maxPrice) return;

  const result = await Api.searchRooms(location, maxPrice);
  renderRooms(result.data || []);
});

initLocations();
