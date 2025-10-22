// main.js - handles navigation, footer year, booking form, and newsletter popup
document.addEventListener("DOMContentLoaded", function () {
  // ✅ Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ✅ Mobile nav toggle
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  // ✅ Booking form handling
  const bookingForm = document.getElementById("bookingForm");
  const formMessage = document.getElementById("formMessage");

  if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      formMessage.textContent = "";

      const data = {
        name: bookingForm.name.value.trim(),
        phone: bookingForm.phone.value.trim(),
        service: bookingForm.service.value,
        date: bookingForm.date.value,
        note: bookingForm.note.value.trim(),
      };

      if (!data.name || !data.phone || !data.service || !data.date) {
        formMessage.textContent = "⚠️ Please fill all required fields.";
        return;
      }

      const submitBtn = document.getElementById("submitBooking");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      try {
        const resp = await fetch("http://localhost:5000/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!resp.ok) throw new Error(await resp.text());

        formMessage.textContent = "✅ Booking received! We'll contact you shortly.";
        bookingForm.reset();
      } catch (err) {
        console.error("Error:", err);
        formMessage.textContent = "❌ Error sending booking. Check console for details.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Booking";
      }
    });
  }

  // ✅ Newsletter popup handling
  const newsletterForm = document.getElementById("newsletterForm");
  const popup = document.getElementById("thankYouPopup");
  const closePopupBtn = document.getElementById("closePopup");
  const responseMsg = document.getElementById("responseMsg");

  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();

      try {
        const res = await fetch("http://localhost:5000/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (res.ok) {
          popup.style.display = "flex";
          newsletterForm.reset();

          // Auto-close after 3 seconds ⏳
          setTimeout(() => {
            popup.style.display = "none";
          }, 3000);
        } else {
          responseMsg.innerText = data.error || "Failed to subscribe.";
        }
      } catch (error) {
        responseMsg.innerText = "Something went wrong. Try again!";
      }
    });
  }

  // ✅ Manual popup close
  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", () => {
      popup.style.display = "none";
    });
  }
});
