(async function () {
  const root = document.getElementById("pc-builder-root");
  if (!root) return;

  // UI Skeleton
  root.innerHTML = `
    <h2>🖥️ Build Your Custom PC</h2>
    <div style="display:flex; gap:20px;">
      <div id="builder-selects">
        <label>CPU:</label>
        <select id="cpu"><option value="">Select CPU</option></select>

        <label>GPU:</label>
        <select id="gpu"><option value="">Select GPU</option></select>

        <label>Motherboard:</label>
        <select id="motherboard"><option value="">Select Motherboard</option></select>

        <button id="add-build">Add Build to Cart</button>
      </div>

      <div id="illustration" style="position:relative; width:400px; height:400px; border:1px solid #ccc;">
        <img src="{{ "case.png" | asset_url }}" id="case" style="width:100%;"/>
        <img id="cpu-img" style="position:absolute; top:80px; left:150px; width:80px;"/>
        <img id="gpu-img" style="position:absolute; top:200px; left:120px; width:200px;"/>
      </div>
    </div>
  `;

  try {
    // Fetch from app proxy

    // const res = await fetch("/apps/pc-builder/products?comp_id=2&cursor=eyJsYXN0X2lkIjoxMDEwNTUxNzE0NjQxMywibGFzdF92YWx1ZSI6IjAifQ==", {
    const res = await fetch("/apps/pc-builder/products?comp_id=2&cursor=", {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'Content-Type' : 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

    const components = await fetch("/apps/pc-builder/components?builder_id=16", {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'Content-Type' : 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

    console.log(res, "res")
    const json = await res.json();

    if (!json.data) {
      root.innerHTML = "<p style='color:red'>⚠️ Could not load products. Check proxy route.</p>";
      return;
    }

    const products = json.data.products.edges.map(e => e.node);

    // Helper: filter by metafield category
    function filterByCategory(category) {
      return products.filter(p =>
        p.variants.edges[0].node.metafields.edges.some(
          m => m.node.key === "category" && m.node.value.toLowerCase() === category
        )
      );
    }

    const cpus = filterByCategory("cpu");
    const gpus = filterByCategory("gpu");
    const motherboards = filterByCategory("motherboard");

    // Populate dropdowns
    function populate(selId, items) {
      const sel = document.getElementById(selId);
      items.forEach(p => {
        const v = p.variants.edges[0].node;
        const opt = document.createElement("option");
        opt.value = v.id; // variant ID
        opt.textContent = p.title;
        opt.dataset.img = p.featuredImage?.url || "";
        sel.appendChild(opt);
      });
    }

    populate("cpu", cpus);
    populate("gpu", gpus);
    populate("motherboard", motherboards);

    // Illustration update
    document.getElementById("cpu").addEventListener("change", e => {
      document.getElementById("cpu-img").src =
        e.target.selectedOptions[0].dataset.img || "";
    });

    document.getElementById("gpu").addEventListener("change", e => {
      document.getElementById("gpu-img").src =
        e.target.selectedOptions[0].dataset.img || "";
    });

    // Add build to cart
    document.getElementById("add-build").addEventListener("click", async () => {
      const items = [];

      ["cpu", "gpu", "motherboard"].forEach(id => {
        const sel = document.getElementById(id);
        if (sel.value) {
          items.push({ id: sel.value, quantity: 1 });
        }
      });

      if (!items.length) {
        alert("Please select at least one component.");
        return;
      }

      try {
        const cartRes = await fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });

        if (cartRes.ok) {
          alert("✅ Build added to cart!");
        } else {
          alert("⚠️ Failed to add to cart.");
        }
      } catch (err) {
        console.error("Cart error:", err);
        alert("⚠️ Error adding to cart.");
      }
    });
  } catch (err) {
    console.error("Fetch error:", err);
    root.innerHTML = "<p style='color:red'>⚠️ Error loading builder.</p>";
  }
})();
