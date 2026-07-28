/* Wrapper fetch() cho các endpoint backend Flask (server/main.py) */

const Api = {
  async listLocations() {
    const res = await fetch("/api/locations");
    return res.json();
  },

  async searchRooms(location, maxPrice) {
    const params = new URLSearchParams({ location, max_price: maxPrice });
    const res = await fetch(`/api/rooms?${params.toString()}`);
    return res.json();
  },

  async getRoom(roomId) {
    const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async bookAppointment(payload) {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async chat(message) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  async listTestCases() {
    const res = await fetch("/api/test-cases");
    return res.json();
  },

  async compare(question) {
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  },
};
