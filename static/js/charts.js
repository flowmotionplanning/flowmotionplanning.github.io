// FMP interactive bar charts — CoStream-style growing bars on scroll.
// Supports: (1) the main metrics chart, (2) named ablation charts.
(function () {
  "use strict";

  var TASKS = ["TableTop", "Box", "Bins", "Shelf 1", "Shelf 2", "Shelf 3"];

  // ─────────────────────────────────────────────────────────────────────────
  // 1. MAIN METRICS CHART  (data-metric attribute)
  // ─────────────────────────────────────────────────────────────────────────

  var MAIN_METHODS = {
    rrtc:      { label:"RRTC",       cls:"m-rrtc",     group:"Sampling" },
    bitstar:   { label:"BIT*",       cls:"m-bitstar",  group:"Sampling" },
    curobo:    { label:"cuRobo",     cls:"m-curobo",   group:"Optim."   },
    curobovox: { label:"cuRobo-Vox", cls:"m-curobovox",group:"Optim."   },
    mpnets:    { label:"MPNets",     cls:"m-mpnets",   group:"Neural"   },
    simpnet:   { label:"SIMPNet",    cls:"m-simpnet",  group:"Neural"   },
    gaide:     { label:"GAIDE",      cls:"m-gaide",    group:"Neural"   },
    perfact:   { label:"PerFACT",    cls:"m-perfact",  group:"Neural"   },
    fmp1:      { label:"FMP-1",      cls:"m-fmp1",     group:"Ours"     },
    fmp100:    { label:"FMP-100",    cls:"m-fmp100",   group:"Ours"     }
  };
  var MAIN_GROUPS  = ["Sampling","Optim.","Neural","Ours"];
  var MAIN_ORDER   = ["rrtc","bitstar","curobo","curobovox","mpnets","simpnet","gaide","perfact","fmp1","fmp100"];

  var MAIN_METRICS = [
    { key:"sr",     label:"Success Rate ↑", unit:"%",   log:false,
      desc:"<b>FMP-100</b> achieves success rates competitive with classical sampling-based planners, while operating at a fundamentally different speed regime. The gap is most visible on the harder shelf environments, where classical methods remain strong but neural informed samplers struggle — FMP-100 consistently pulls ahead of all neural baselines there. Even without best-of-N selection, <b>FMP-1</b> holds its own against neural informed samplers, which is notable given that those methods still rely on a privileged collision checker during planning.",
      data:{ rrtc:[88.0,71.0,98.3,98.0,82.6,45.0], bitstar:[71.0,67.0,93.8,91.0,75.0,38.0],
             curobo:[81.0,63.7,89.5,37.7,75.0,65.7], curobovox:[76.0,63.3,89.3,39.7,75.3,66.0],
             mpnets:[41.0,62.0,84.5,39.0,34.0,32.0], simpnet:[51.0,67.0,94.2,44.0,35.0,33.0],
             gaide:[52.0,65.0,96.0,55.0,44.0,38.0], perfact:[58.0,61.3,84.5,35.7,34.6,33.4],
             fmp1:[48.0,60.7,75.5,45.0,34.4,33.4], fmp100:[84.0,66.0,96.8,79.4,57.7,53.4] }},
    { key:"time",   label:"Planning Time ↓", unit:"s",  log:false,
      desc:"<b>FMP-1</b> is the fastest planner across all tasks, and by a substantial margin — classical sampling-based and neural informed samplers all require significantly more time per query. The key reason is architectural: FMP avoids sequential collision checking entirely during planning, performing it in a single parallelized pass over all candidates after generation. <b>FMP-100</b>, despite evaluating 100 candidates, remains faster than most baselines, demonstrating that the best-of-N overhead is modest compared to the savings from eliminating iterative tree expansion.",
      data:{ rrtc:[2.85,0.73,1.10,2.71,3.91,4.07], bitstar:[3.19,1.40,1.84,4.35,5.95,4.84],
             curobo:[1.97,0.45,0.17,0.89,0.48,0.86], curobovox:[1.62,0.46,0.16,0.48,0.37,0.86],
             mpnets:[2.66,2.41,3.45,2.29,2.57,3.43], simpnet:[5.68,2.68,3.97,3.28,2.96,6.88],
             gaide:[3.00,2.17,3.72,2.99,5.56,4.34], perfact:[0.22,0.23,0.24,0.24,0.22,0.22],
             fmp1:[0.16,0.16,0.16,0.16,0.15,0.16], fmp100:[0.58,0.38,0.43,0.58,0.67,0.81] }},
    { key:"cost",   label:"Path Length ↓",   unit:"rad",log:false,
      desc:"Path length naturally separates the planners into two tiers: sampling-based methods (RRTC, BIT*) produce significantly longer paths due to their random tree expansion, while optimization-based and neural methods all converge toward much shorter, more direct trajectories. <b>FMP-1</b> sits comfortably in this efficient tier and is competitive with the best neural baselines. <b>FMP-100</b> trades a small amount of path optimality for better collision avoidance during best-of-N selection — a deliberate design choice, not a limitation.",
      data:{ rrtc:[15.24,12.23,12.62,20.04,15.68,13.95], bitstar:[9.31,5.19,6.62,13.48,9.87,7.85],
             curobo:[6.06,4.57,5.26,7.16,5.53,6.14], curobovox:[6.01,4.57,5.25,7.10,5.57,6.24],
             mpnets:[5.64,4.84,5.58,7.69,5.33,6.20], simpnet:[5.67,4.57,5.45,6.01,5.04,6.04],
             gaide:[5.56,4.55,5.39,6.64,4.87,5.88], perfact:[5.35,4.87,5.39,5.27,5.39,5.93],
             fmp1:[5.50,4.51,5.61,6.92,5.06,5.84], fmp100:[6.07,4.64,5.44,6.91,5.44,6.04] }},
    { key:"smooth", label:"Smoothness ↓",    unit:"",   log:true,
      desc:"Trajectory smoothness reveals a clear three-tier structure. Optimization-based methods (cuRobo) set the gold standard — smoothness is baked into their objective by design. Sampling-based planners produce the roughest trajectories, as random tree expansion creates erratic waypoints. <b>FMP-1</b> and <b>FMP-100</b> fall comfortably in the middle tier alongside PerFACT, producing smooth, well-behaved trajectories through learned joint-space increments — without ever explicitly optimizing for smoothness during training or inference. <em>(log scale)</em>",
      data:{ rrtc:[7.02,7.66,7.41,6.99,7.40,6.97], bitstar:[4.74,1.20,2.15,7.47,4.63,2.79],
             curobo:[0.01,0.01,0.01,0.01,0.01,0.01], curobovox:[0.01,0.01,0.01,0.01,0.01,0.01],
             mpnets:[1.83,1.00,1.34,2.51,1.44,1.15], simpnet:[1.36,0.62,1.04,0.88,0.94,0.63],
             gaide:[1.71,0.46,0.84,1.18,0.83,0.58], perfact:[0.03,0.02,0.03,0.02,0.03,0.03],
             fmp1:[0.03,0.03,0.03,0.03,0.03,0.03], fmp100:[0.03,0.03,0.03,0.03,0.03,0.03] }},
    { key:"jerk",   label:"Jerk ↓",          unit:"",   log:true,
      desc:"Jerk tells the same story as smoothness, and the three-tier pattern holds. Optimization-based methods lead due to explicit smoothness constraints, sampling-based methods trail far behind, and <b>FMP-1/FMP-100</b> land in the favorable middle — on par with PerFACT and well separated from neural informed samplers. This suggests that learning to predict incremental joint-space actions implicitly encourages smooth, low-jerk trajectories, without any explicit jerk penalty in the training objective. <em>(log scale)</em>",
      data:{ rrtc:[6.03,3.05,3.95,8.89,6.60,5.15], bitstar:[3.42,0.07,0.12,6.74,4.78,1.29],
             curobo:[0.01,0.01,0.01,0.01,0.01,0.01], curobovox:[0.01,0.01,0.01,0.01,0.01,0.01],
             mpnets:[0.41,0.15,0.31,1.58,0.18,0.58], simpnet:[0.15,0.16,0.39,0.005,0.58,0.56],
             gaide:[0.96,0.29,0.50,0.80,0.58,0.44], perfact:[0.02,0.02,0.02,0.02,0.02,0.02],
             fmp1:[0.02,0.02,0.02,0.03,0.02,0.03], fmp100:[0.02,0.02,0.02,0.03,0.03,0.03] }}
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // 2. NAMED ABLATION CHARTS  (data-chart attribute)
  // ─────────────────────────────────────────────────────────────────────────

  var NAMED_CHARTS = {

    // ── GMM vs FMP ──────────────────────────────────────────────────────────
    gmm: {
      groups: [
        { label:"GMM", methods:["gmm1","gmm100"] },
        { label:"FMP (ours)", methods:["fmp_1","fmp_100"] }
      ],
      methodDefs: {
        gmm1:    { label:"GMM-1",    cls:"m-gmm1"    },
        gmm100:  { label:"GMM-100",  cls:"m-gmm100"  },
        fmp_1:   { label:"FMP-1",    cls:"m-fmp1"    },
        fmp_100: { label:"FMP-100",  cls:"m-fmp100"  }
      },
      methodOrder: ["gmm1","gmm100","fmp_1","fmp_100"],
      tasks: TASKS,
      tabs: [
        { key:"sr",   label:"Success Rate ↑", unit:"%", log:false,
          data:{ gmm1:[4.0,47.0,27.0,14.0,11.0,13.0],
                 gmm100:[47.0,61.0,58.5,43.4,34.4,29.4],
                 fmp_1:[48.0,60.7,75.5,45.0,34.4,33.4],
                 fmp_100:[84.0,66.0,96.8,79.4,57.7,53.4] }},
        { key:"time", label:"Planning Time ↓", unit:"s", log:false,
          data:{ gmm1:[0.70,0.72,0.74,0.72,0.70,0.73],
                 gmm100:[3.47,3.43,3.64,3.55,3.51,3.44],
                 fmp_1:[0.16,0.16,0.16,0.16,0.15,0.16],
                 fmp_100:[0.58,0.38,0.43,0.58,0.67,0.81] }}
      ]
    },

    // ── Policy Head Architecture ─────────────────────────────────────────────
    head: {
      groups: [
        { label:"DMP", methods:["dmp_mlp","dmp_unet","dmp_tr","dmp_dit"] },
        { label:"FMP (ours)", methods:["fmp_mlp","fmp_unet","fmp_tr","fmp_dit"] }
      ],
      methodDefs: {
        dmp_mlp:  { label:"DMP-MLP",         cls:"m-dmp-mlp"  },
        dmp_unet: { label:"DMP-UNet",        cls:"m-dmp-unet" },
        dmp_tr:   { label:"DMP-Transformer", cls:"m-dmp-tr"   },
        dmp_dit:  { label:"DMP-DiT",         cls:"m-dmp-dit"  },
        fmp_mlp:  { label:"FMP-MLP",         cls:"m-fmp-mlp"  },
        fmp_unet: { label:"FMP-UNet",        cls:"m-fmp-unet" },
        fmp_tr:   { label:"FMP-Transformer", cls:"m-fmp-tr"   },
        fmp_dit:  { label:"FMP-DiT",         cls:"m-fmp-dit"  }
      },
      methodOrder: ["dmp_mlp","dmp_unet","dmp_tr","dmp_dit","fmp_mlp","fmp_unet","fmp_tr","fmp_dit"],
      tasks: TASKS,
      tabs: [
        { key:"sr_n1",   label:"Success Rate N=1 ↑",   unit:"%", log:false,
          data:{ dmp_mlp:[34.0,55.7,57.3,35.4,26.0,31.0], dmp_unet:[49.0,55.7,62.0,34.4,26.7,28.7],
                 dmp_tr:[43.0,59.0,70.0,38.0,30.7,32.7],  dmp_dit:[45.0,58.4,70.3,35.7,32.7,30.4],
                 fmp_mlp:[48.0,60.7,75.5,45.0,34.4,33.4], fmp_unet:[48.0,59.4,72.3,44.0,31.4,32.4],
                 fmp_tr:[43.0,60.0,77.3,53.0,36.0,35.0],  fmp_dit:[47.0,62.0,80.0,56.4,34.7,34.0] }},
        { key:"sr_n100", label:"Success Rate N=100 ↑", unit:"%", log:false,
          data:{ dmp_mlp:[71.0,65.7,90.5,69.4,50.0,53.4], dmp_unet:[81.0,67.7,92.8,68.4,52.0,48.7],
                 dmp_tr:[78.0,66.0,90.5,65.4,46.0,48.0],  dmp_dit:[77.0,68.0,93.3,71.7,60.0,53.7],
                 fmp_mlp:[84.0,66.0,96.8,79.4,57.7,53.4], fmp_unet:[85.0,68.0,96.3,85.7,53.7,53.7],
                 fmp_tr:[80.0,67.4,95.5,83.7,56.7,46.4],  fmp_dit:[83.0,68.4,96.5,86.4,58.0,52.0] }},
        { key:"t_n1",    label:"Planning Time N=1 ↓",  unit:"s", log:false,
          data:{ dmp_mlp:[0.37,0.38,0.38,0.38,0.37,0.37], dmp_unet:[2.08,2.75,2.78,2.63,2.65,2.75],
                 dmp_tr:[2.31,2.28,2.31,2.21,2.17,2.29],  dmp_dit:[2.28,2.22,2.25,2.20,2.26,2.15],
                 fmp_mlp:[0.16,0.16,0.16,0.16,0.15,0.16], fmp_unet:[0.75,0.75,0.77,0.77,0.76,0.77],
                 fmp_tr:[0.55,0.57,0.54,0.55,0.56,0.55],  fmp_dit:[0.57,0.55,0.55,0.54,0.56,0.56] }},
        { key:"t_n100",  label:"Planning Time N=100 ↓", unit:"s", log:false,
          data:{ dmp_mlp:[0.74,0.63,0.68,0.69,0.88,0.95], dmp_unet:[3.19,3.09,3.02,3.16,3.20,3.18],
                 dmp_tr:[3.02,2.89,2.89,3.11,3.00,3.04],  dmp_dit:[2.87,2.63,2.56,2.83,2.75,2.94],
                 fmp_mlp:[0.58,0.38,0.43,0.58,0.67,0.81], fmp_unet:[1.23,1.14,1.07,1.25,1.38,1.32],
                 fmp_tr:[1.23,1.08,0.91,1.08,1.17,1.28],  fmp_dit:[1.06,0.96,0.86,1.00,1.22,1.32] }}
      ]
    },

    // ── NFE Ablation ────────────────────────────────────────────────────────
    nfe: {
      groups: [
        { label:"DMP", methods:["dmp_1","dmp_100"] },
        { label:"FMP (ours)", methods:["fmp_1","fmp_100"] }
      ],
      methodDefs: {
        dmp_1:   { label:"DMP (N=1)",   cls:"m-dmp-mlp"  },
        dmp_100: { label:"DMP (N=100)", cls:"m-dmp-unet" },
        fmp_1:   { label:"FMP (N=1)",   cls:"m-fmp1"     },
        fmp_100: { label:"FMP (N=100)", cls:"m-fmp100"   }
      },
      methodOrder: ["dmp_1","dmp_100","fmp_1","fmp_100"],
      tasks: ["NFE=5","NFE=10","NFE=20","NFE=50","NFE=100"],
      tabs: [
        { key:"sr",   label:"Success Rate ↑", unit:"%", log:false,
          data:{ dmp_1:[42.4,43.4,41.8,41.7,41.6], dmp_100:[66.5,66.7,67.3,68.2,67.5],
                 fmp_1:[52.1,51.4,51.2,50.8,50.9], fmp_100:[70.5,72.0,72.9,73.4,73.4] }},
        { key:"time", label:"Planning Time ↓", unit:"s", log:false,
          data:{ dmp_1:[0.14,0.24,0.42,0.98,1.90], dmp_100:[0.42,0.72,1.26,2.94,5.70],
                 fmp_1:[0.03,0.05,0.09,0.21,0.40], fmp_100:[0.09,0.15,0.27,0.63,1.20] }}
      ]
    },

    // ── Real-world Deployment ───────────────────────────────────────────────
    realworld: {
      groups: [
        { label:"Policy", methods:["fmp1","fmp100"] }
      ],
      methodDefs: {
        fmp1:   { label:"FMP-1",          cls:"m-fmp1"   },
        fmp100: { label:"FMP-100 (ours)", cls:"m-fmp100" }
      },
      methodOrder: ["fmp1","fmp100"],
      tasks: ["1. Bins", "2. Articulated", "3. Shelves", "4. Total"],
      tabs: [
        { key:"sr", label:"Success Rate ↑", unit:"%", log:false,
          data:{ fmp1:[50.0,30.0,20.0,33.4], fmp100:[100.0,100.0,60.0,86.7] }}
      ]
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SHARED RENDERING HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  function dataRange(data, methodOrder) {
    var min = Infinity, max = -Infinity;
    methodOrder.forEach(function (m) {
      (data[m] || []).forEach(function (v) {
        if (v < min) min = v;
        if (v > max) max = v;
      });
    });
    return { min: min, max: max * 1.08 };
  }

  function toHeight(v, range, useLog) {
    if (useLog) {
      var lmin = Math.log10(Math.max(range.min, 1e-4));
      var lmax = Math.log10(Math.max(range.max, 1e-4));
      var lv   = Math.log10(Math.max(v, 1e-4));
      return lmax > lmin ? ((lv - lmin) / (lmax - lmin)) * 92 : 0;
    }
    return range.max > 0 ? (v / range.max) * 92 : 0;
  }

  function fmtVal(v, unit) {
    if (unit === "%")   return v.toFixed(1) + "%";
    if (unit === "s")   return v.toFixed(2) + "s";
    if (unit === "rad") return v.toFixed(2);
    return v < 0.1 ? v.toFixed(3) : v.toFixed(2);
  }

  // Build legend for a generic {groups, methodDefs, methodOrder} spec
  function buildGenericLegend(container, spec) {
    var legend = document.createElement("div");
    legend.className = "fmp-legend";
    spec.groups.forEach(function (grp) {
      var grpEl = document.createElement("span");
      grpEl.className = "fmp-legend-group";
      var lbl = document.createElement("span");
      lbl.className = "fmp-legend-group-label";
      lbl.textContent = grp.label + ":";
      grpEl.appendChild(lbl);
      grp.methods.forEach(function (m) {
        var def  = spec.methodDefs[m];
        var item = document.createElement("span");
        item.className = "fmp-legend-item";
        var sw = document.createElement("span");
        sw.className = "fmp-legend-swatch " + def.cls;
        item.appendChild(sw);
        item.appendChild(document.createTextNode(def.label));
        grpEl.appendChild(item);
      });
      legend.appendChild(grpEl);
    });
    container.appendChild(legend);
  }

  // Build plot for a tab (tab has: data, unit, log, methodOrder, methodDefs, groups, tasks)
  function buildGenericPlot(wrap, tab, spec) {
    var useLog = tab.log;
    var range  = dataRange(tab.data, spec.methodOrder);
    if (!useLog && tab.unit === "%") range = { min: 0, max: 100 };

    // Y-axis
    var axis = document.createElement("div");
    axis.className = "fmp-y-axis";
    var ticks;
    if (useLog) {
      ticks = [0.01, 0.1, 1, 10].filter(function (t) { return t <= range.max * 1.1; });
    } else if (tab.unit === "%") {
      ticks = [0, 25, 50, 75, 100].filter(function (t) { return t <= range.max * 1.1; });
    } else {
      var step = range.max > 6 ? 2 : range.max > 2 ? 1 : 0.5;
      ticks = [];
      for (var t = 0; t <= Math.ceil(range.max) + step; t += step) ticks.push(Math.round(t * 10) / 10);
    }
    ticks.slice().reverse().forEach(function (v) {
      var tick = document.createElement("div");
      tick.className = "fmp-y-tick";
      tick.textContent = useLog ? (v >= 1 ? v : v.toString()) : fmtVal(v, tab.unit);
      axis.appendChild(tick);
    });
    wrap.appendChild(axis);

    // Plot area
    var plot = document.createElement("div");
    plot.className = "fmp-chart-plot";

    spec.tasks.forEach(function (task, ti) {
      var group = document.createElement("div");
      group.className = "fmp-bar-group";
      var bars  = document.createElement("div");
      bars.className = "fmp-bar-group-bars";

      var prevGrp = null;
      spec.methodOrder.forEach(function (m) {
        // determine group for spacing
        var curGrp = null;
        spec.groups.forEach(function (g) { if (g.methods.indexOf(m) >= 0) curGrp = g.label; });
        if (prevGrp && curGrp !== prevGrp) {
          var sp = document.createElement("div"); sp.className = "fmp-bar-spacer"; bars.appendChild(sp);
        }
        prevGrp = curGrp;

        var v   = (tab.data[m] || [])[ti];
        if (v === undefined || v === null) return;
        var pct = toHeight(v, range, useLog);

        var bar = document.createElement("div");
        bar.className = "fmp-bar " + spec.methodDefs[m].cls;
        bar.style.setProperty("--target", pct + "%");

        var tip = document.createElement("span");
        tip.className = "fmp-bar-tooltip";
        tip.textContent = spec.methodDefs[m].label + ": " + fmtVal(v, tab.unit);
        bar.appendChild(tip);
        bars.appendChild(bar);
      });

      group.appendChild(bars);
      var lbl = document.createElement("div");
      lbl.className = "fmp-bar-group-label";
      lbl.textContent = task;
      group.appendChild(lbl);
      plot.appendChild(group);
    });
    wrap.appendChild(plot);
  }

  // Build tabs + chart for a named chart
  function buildNamedChart(el) {
    var key  = el.getAttribute("data-chart");
    var spec = NAMED_CHARTS[key];
    if (!spec) return;

    var activeIdx = 0;

    var tabs = document.createElement("div");
    tabs.className = "fmp-metric-tabs";
    spec.tabs.forEach(function (tab, idx) {
      var btn = document.createElement("button");
      btn.className = "fmp-metric-tab" + (idx === 0 ? " active" : "");
      btn.textContent = tab.label;
      btn.addEventListener("click", function () {
        if (idx === activeIdx) return;
        activeIdx = idx;
        tabs.querySelectorAll(".fmp-metric-tab").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        wrap.innerHTML = "";
        buildGenericPlot(wrap, spec.tabs[activeIdx], spec);
      });
      tabs.appendChild(btn);
    });
    el.appendChild(tabs);

    buildGenericLegend(el, spec);

    var wrap = document.createElement("div");
    wrap.className = "fmp-chart-wrap";
    el.appendChild(wrap);
    buildGenericPlot(wrap, spec.tabs[0], spec);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. MAIN METRICS CHART (data-metric="sr" div)
  // ─────────────────────────────────────────────────────────────────────────

  function buildMainLegend(container) {
    var legend = document.createElement("div");
    legend.className = "fmp-legend";
    MAIN_GROUPS.forEach(function (grp) {
      var grpEl = document.createElement("span");
      grpEl.className = "fmp-legend-group";
      var lbl = document.createElement("span");
      lbl.className = "fmp-legend-group-label";
      lbl.textContent = grp + ":";
      grpEl.appendChild(lbl);
      MAIN_ORDER.forEach(function (m) {
        if (MAIN_METHODS[m].group !== grp) return;
        var item = document.createElement("span");
        item.className = "fmp-legend-item";
        var sw = document.createElement("span");
        sw.className = "fmp-legend-swatch " + MAIN_METHODS[m].cls;
        item.appendChild(sw);
        item.appendChild(document.createTextNode(MAIN_METHODS[m].label));
        grpEl.appendChild(item);
      });
      legend.appendChild(grpEl);
    });
    container.appendChild(legend);
  }

  function buildMainPlot(wrap, metric) {
    var useLog = metric.log;
    var range  = dataRange(metric.data, MAIN_ORDER);

    var axis = document.createElement("div");
    axis.className = "fmp-y-axis";
    var ticks;
    if (useLog) {
      ticks = [0.01, 0.1, 1, 10].filter(function (t) { return t <= range.max; });
    } else if (metric.unit === "%") {
      ticks = [0, 25, 50, 75, 100];
    } else {
      var step = range.max > 10 ? 5 : range.max > 4 ? 2 : 1;
      ticks = [];
      for (var t = 0; t <= Math.ceil(range.max); t += step) ticks.push(t);
    }
    ticks.slice().reverse().forEach(function (v) {
      var tick = document.createElement("div");
      tick.className = "fmp-y-tick";
      tick.textContent = useLog ? v : fmtVal(v, metric.unit);
      axis.appendChild(tick);
    });
    wrap.appendChild(axis);

    var plot = document.createElement("div");
    plot.className = "fmp-chart-plot";

    TASKS.forEach(function (task, ti) {
      var group = document.createElement("div");
      group.className = "fmp-bar-group";
      var bars  = document.createElement("div");
      bars.className = "fmp-bar-group-bars";

      var prevGrp = null;
      MAIN_ORDER.forEach(function (m) {
        var curGrp = MAIN_METHODS[m].group;
        if (prevGrp && curGrp !== prevGrp) {
          var sp = document.createElement("div"); sp.className = "fmp-bar-spacer"; bars.appendChild(sp);
        }
        prevGrp = curGrp;

        var v   = metric.data[m][ti];
        var pct = toHeight(v, range, useLog);

        var bar = document.createElement("div");
        bar.className = "fmp-bar " + MAIN_METHODS[m].cls;
        bar.style.setProperty("--target", pct + "%");

        var tip = document.createElement("span");
        tip.className = "fmp-bar-tooltip";
        tip.textContent = MAIN_METHODS[m].label + ": " + fmtVal(v, metric.unit);
        bar.appendChild(tip);
        bars.appendChild(bar);
      });

      group.appendChild(bars);
      var lbl = document.createElement("div");
      lbl.className = "fmp-bar-group-label";
      lbl.textContent = task;
      group.appendChild(lbl);
      plot.appendChild(group);
    });
    wrap.appendChild(plot);
  }

  function buildMainChart(el) {
    var activeKey = MAIN_METRICS[0].key;

    var tabs = document.createElement("div");
    tabs.className = "fmp-metric-tabs";
    MAIN_METRICS.forEach(function (m) {
      var btn = document.createElement("button");
      btn.className = "fmp-metric-tab" + (m.key === activeKey ? " active" : "");
      btn.textContent = m.label;
      btn.addEventListener("click", function () {
        if (m.key === activeKey) return;
        activeKey = m.key;
        tabs.querySelectorAll(".fmp-metric-tab").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        wrap.innerHTML = "";
        var metric = MAIN_METRICS.find(function (x) { return x.key === activeKey; });
        buildMainPlot(wrap, metric);
        desc.innerHTML = metric.desc;
        desc.classList.remove("desc-visible");
        // tiny delay so the fade-in triggers even if content didn't change
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { desc.classList.add("desc-visible"); });
        });
      });
      tabs.appendChild(btn);
    });
    el.appendChild(tabs);
    buildMainLegend(el);

    var wrap = document.createElement("div");
    wrap.className = "fmp-chart-wrap";
    el.appendChild(wrap);
    buildMainPlot(wrap, MAIN_METRICS[0]);

    // description box — fades in on tab switch
    var desc = document.createElement("p");
    desc.className = "fmp-chart-desc desc-visible";
    desc.innerHTML = MAIN_METRICS[0].desc;
    el.appendChild(desc);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // 5. SVG LINE CHARTS  (TTS, Best-of-N, Inference Steps)
  // ─────────────────────────────────────────────────────────────────────────

  var ARCH_LINE = {
    "MLP":         { color:"#c0392b", dash:"none",  label:"MLP" },
    "U-Net":       { color:"#2872B5", dash:"none",  label:"U-Net" },
    "Transformer": { color:"#E07020", dash:"none",  label:"Transformer" },
    "DiT":         { color:"#7B5EA7", dash:"none",  label:"DiT" }
  };
  var ARCH_LINE_DMP = {
    "MLP":         { color:"#e57373", dash:"6,3",  label:"DMP-MLP" },
    "U-Net":       { color:"#7AAFD4", dash:"6,3",  label:"DMP-U-Net" },
    "Transformer": { color:"#EBA070", dash:"6,3",  label:"DMP-Transformer" },
    "DiT":         { color:"#B8A0D0", dash:"6,3",  label:"DMP-DiT" }
  };
  var ARCH_ORDER = ["MLP","U-Net","Transformer","DiT"];

  // ── All line-chart data (pre-computed from CSV) ───────────────────────────
  var NS_=[10,20,30,40,50,60,70,80,90,110,120,130,140,150,160,170,180,190,200];
  var ST_=[5,10,15,30,40,50,60,70,80,90];
  var LINE_DATA = {
    bon: {
      FMP: {
        "MLP":         {ns:NS_,sr:[65.22,68.33,69.73,70.49,71.59,72.14,71.93,72.58,72.4,73.56,73.83,73.71,74.16,73.54,74.11,74.48,74.66,74.22,75.1],sr_std:[17.06,17.9,17.68,17.08,16.82,17.15,16.44,16.85,16.81,16.89,16.85,17.69,16.79,16.35,16.09,16.77,16.43,16.53,17.09],time:[0.1483,0.1659,0.1835,0.2012,0.2188,0.2364,0.254,0.2716,0.2892,0.3245,0.3421,0.3597,0.3773,0.3949,0.4126,0.4302,0.4478,0.4654,0.483],time_std:[0.0125,0.0119,0.0113,0.0107,0.0101,0.0095,0.0089,0.0083,0.0077,0.0065,0.0059,0.0052,0.0046,0.004,0.0034,0.0028,0.0022,0.0016,0.001]},
        "U-Net":       {ns:NS_,sr:[64.6,67.51,69.85,70.72,71.54,71.44,71.93,72.73,73.01,73.68,73.56,73.77,73.52,73.61,74.97,74.56,74.99,75.21,75.55],sr_std:[18.27,18.5,18.82,18.3,18.69,18.92,19.45,18.79,18.46,17.57,18.27,17.86,17.66,17.38,17.15,17.91,17.23,17.58,16.71],time:[0.4656,0.7784,1.0912,1.404,1.7167,2.0295,2.3423,2.6551,2.9678,3.5934,3.9062,4.2189,4.5317,4.8445,5.1573,5.4701,5.7828,6.0956,6.4084],time_std:[0.0151,0.0173,0.0195,0.0217,0.0238,0.026,0.0282,0.0304,0.0326,0.0369,0.0391,0.0413,0.0435,0.0457,0.0479,0.0501,0.0522,0.0544,0.0566]},
        "Transformer": {ns:NS_,sr:[62.87,66.5,67.58,68.67,69.87,69.81,70.05,70.62,70.73,71.08,71.76,72.38,72.82,72.38,71.94,72.33,72.44,72.73,73.21],sr_std:[19.51,18.5,19.22,18.79,18.36,18.68,18.4,18.11,18.55,18.58,18.33,18.22,17.42,18.12,18.13,18.19,18.12,18.3,17.95],time:[0.3478,0.551,0.7542,0.9574,1.1606,1.3638,1.5671,1.7703,1.9735,2.3799,2.5831,2.7863,2.9895,3.1928,3.396,3.5992,3.8024,4.0056,4.2088],time_std:[0.0112,0.0114,0.0116,0.0119,0.0121,0.0123,0.0126,0.0128,0.013,0.0135,0.0137,0.0139,0.0142,0.0144,0.0146,0.0149,0.0151,0.0153,0.0156]},
        "DiT":         {ns:NS_,sr:[65.56,69.8,70.23,72.19,72.37,73.57,73.27,74.44,74.1,74.79,75.77,75.32,75.47,76.1,75.62,76.18,76.02,76.79,76.35],sr_std:[18.82,18.19,18.65,17.09,17.12,17.74,16.78,17.48,16.75,17.08,16.71,16.69,16.69,15.93,16.85,16.01,16.49,15.96,15.63],time:[0.3504,0.5494,0.7485,0.9475,1.1466,1.3456,1.5447,1.7437,1.9428,2.3409,2.5399,2.739,2.938,3.1371,3.3361,3.5351,3.7342,3.9332,4.1323],time_std:[0.0137,0.0136,0.0135,0.0133,0.0132,0.0131,0.013,0.0129,0.0127,0.0125,0.0124,0.0123,0.0121,0.012,0.0119,0.0118,0.0117,0.0116,0.0114]}
      },
      DMP: {
        "MLP":         {ns:NS_,sr:[58.6,62.31,62.99,64.16,64.86,65.99,66.43,66.17,67.39,67.56,67.55,68.66,67.91,68.42,68.65,68.77,68.97,68.71,69.17],sr_std:[14.82,15.46,15.19,15.17,15.01,14.95,15.08,14.26,14.53,15.14,14.54,14.25,13.89,14.8,14.26,14.71,14.4,14.68,14.18],time:[0.4328,0.47,0.5073,0.5445,0.5817,0.619,0.6562,0.6934,0.7307,0.8051,0.8424,0.8796,0.9169,0.9541,0.9913,1.0286,1.0658,1.103,1.1403],time_std:[0.1076,0.16,0.2123,0.2647,0.3171,0.3694,0.4218,0.4741,0.5265,0.6312,0.6836,0.7359,0.7883,0.8406,0.893,0.9453,0.9977,1.0501,1.1024]},
        "U-Net":       {ns:NS_,sr:[60.5,63.93,65.09,66.72,66.58,68.33,67.49,68.81,69.02,69.83,69.38,69.59,70.05,70.41,70.05,70.05,70.43,71.14,71.52],sr_std:[17.62,17.68,16.86,17.37,15.85,15.89,16.31,15.95,16.15,16.45,15.62,16.25,16.17,15.89,16.07,15.95,16.1,16.81,16.17],time:[2.7908,2.8248,2.8588,2.8928,2.9269,2.9609,2.9949,3.0289,3.063,3.131,3.165,3.1991,3.2331,3.2671,3.3011,3.3352,3.3692,3.4032,3.4372],time_std:[0.1268,0.176,0.2251,0.2742,0.3234,0.3725,0.4216,0.4707,0.5199,0.6181,0.6673,0.7164,0.7655,0.8146,0.8638,0.9129,0.962,1.0112,1.0603]},
        "Transformer": {ns:NS_,sr:[59.26,61.75,62.5,63.87,64.22,64.62,64.97,65.53,65.3,65.83,65.87,66.51,66.77,66.93,67.25,67.5,67.23,67.26,68.06],sr_std:[16.44,16.26,16.71,16.94,16.64,17.01,17.19,17.45,17.09,16.83,16.42,17.25,16.88,16.87,17.24,17.25,16.81,16.8,17.31],time:[2.067,2.2299,2.3929,2.5559,2.7189,2.8819,3.0448,3.2078,3.3708,3.6967,3.8597,4.0227,4.1857,4.3487,4.5116,4.6746,4.8376,5.0006,5.1635],time_std:[0.1006,0.1482,0.1958,0.2435,0.2911,0.3387,0.3864,0.434,0.4817,0.5769,0.6246,0.6722,0.7198,0.7675,0.8151,0.8628,0.9104,0.958,1.0057]},
        "DiT":         {ns:NS_,sr:[62.24,64.98,66.86,67.97,69.26,69.33,70.04,69.77,71.37,71.47,71.83,71.57,72.52,73.8,72.61,73.38,73.4,74.67,73.84],sr_std:[15.07,15.25,14.9,13.68,14.08,14.29,13.99,14.03,13.67,13.53,13.2,13.37,13.57,13.47,13.2,13.35,13.46,13.46,13.82],time:[2.4148,2.4498,2.4848,2.5198,2.5548,2.5898,2.6248,2.6598,2.6948,2.7648,2.7998,2.8348,2.8698,2.9048,2.9398,2.9748,3.0098,3.0448,3.0798],time_std:[0.1027,0.1537,0.2047,0.2557,0.3067,0.3577,0.4087,0.4597,0.5107,0.6127,0.6637,0.7147,0.7657,0.8167,0.8676,0.9186,0.9696,1.0206,1.0716]}
      }
    },
    tts: {
      FMP: {
        "MLP":         {ns:NS_,tts:[0.1483,0.1659,0.1835,0.2012,0.2188,0.2364,0.254,0.2716,0.2892,0.3245,0.3421,0.3597,0.3773,0.3949,0.4126,0.4302,0.4478,0.4654,0.483],sr:[65.22,68.33,69.73,70.49,71.59,72.14,71.93,72.58,72.4,73.56,73.83,73.71,74.16,73.54,74.11,74.48,74.66,74.22,75.1]},
        "U-Net":       {ns:NS_,tts:[0.4656,0.7784,1.0912,1.404,1.7167,2.0295,2.3423,2.6551,2.9678,3.5934,3.9062,4.2189,4.5317,4.8445,5.1573,5.4701,5.7828,6.0956,6.4084],sr:[64.6,67.51,69.85,70.72,71.54,71.44,71.93,72.73,73.01,73.68,73.56,73.77,73.52,73.61,74.97,74.56,74.99,75.21,75.55]},
        "Transformer": {ns:NS_,tts:[0.3478,0.551,0.7542,0.9574,1.1606,1.3638,1.5671,1.7703,1.9735,2.3799,2.5831,2.7863,2.9895,3.1928,3.396,3.5992,3.8024,4.0056,4.2088],sr:[62.87,66.5,67.58,68.67,69.87,69.81,70.05,70.62,70.73,71.08,71.76,72.38,72.82,72.38,71.94,72.33,72.44,72.73,73.21]},
        "DiT":         {ns:NS_,tts:[0.3504,0.5494,0.7485,0.9475,1.1466,1.3456,1.5447,1.7437,1.9428,2.3409,2.5399,2.739,2.938,3.1371,3.3361,3.5351,3.7342,3.9332,4.1323],sr:[65.56,69.8,70.23,72.19,72.37,73.57,73.27,74.44,74.1,74.79,75.77,75.32,75.47,76.1,75.62,76.18,76.02,76.79,76.35]}
      }
    },
    steps: {
      N1: {
        "MLP":         {steps:ST_,sr:[50.14,49.52,49.56,49.29,49.23,48.93,48.89,48.83,49.0,49.0],sr_std:[16.0,15.95,15.57,15.36,15.31,15.25,15.17,15.18,15.14,15.14],time:[0.1392,0.1481,0.1566,0.1833,0.2013,0.2213,0.2364,0.2536,0.2712,0.2887],time_std:[0.0225,0.0111,0.0087,0.0072,0.0063,0.0122,0.0069,0.0096,0.0083,0.0112]},
        "U-Net":       {steps:ST_,sr:[49.34,49.21,48.88,48.67,48.67,48.73,48.73,48.67,48.77,48.71],sr_std:[17.52,16.46,16.41,16.52,16.46,16.34,16.34,16.41,16.41,16.42],time:[0.3776,0.4822,0.5808,0.8756,1.0736,1.2693,1.4679,1.6623,1.8618,2.0583],time_std:[0.0268,0.0111,0.011,0.0156,0.0212,0.022,0.0212,0.0302,0.035,0.0332]},
        "Transformer": {steps:ST_,sr:[50.91,50.82,50.74,50.76,50.56,50.56,50.61,50.61,50.67,50.67],sr_std:[18.4,18.42,18.35,18.09,18.03,18.03,17.98,17.98,17.99,17.99],time:[0.2438,0.3453,0.4494,0.7569,0.9595,1.1616,1.3668,1.5673,1.7705,1.9691],time_std:[0.0201,0.005,0.0094,0.0119,0.0096,0.0103,0.0109,0.0157,0.0146,0.0124]},
        "DiT":         {steps:ST_,sr:[52.72,52.44,51.72,51.81,51.86,51.9,51.9,51.9,51.9,51.85],sr_std:[19.21,18.88,18.45,18.1,18.26,18.4,18.4,18.4,18.4,18.37],time:[0.2497,0.3495,0.4492,0.7493,0.9492,1.1501,1.3459,1.5418,1.7443,1.9417],time_std:[0.0251,0.0105,0.0091,0.0083,0.0142,0.0129,0.0103,0.0111,0.0155,0.0157]}
      },
      N100: {
        "MLP":         {steps:ST_,sr:[70.27,72.33,72.99,73.82,73.8,73.8,73.97,73.97,73.97,74.02],sr_std:[17.38,17.36,17.45,17.13,17.1,17.2,17.12,17.12,17.12,17.14],time:[0.5516,0.5929,0.5891,0.643,0.6596,0.6758,0.6939,0.7098,0.7264,0.7453],time_std:[0.6045,0.6401,0.6107,0.6566,0.6478,0.6429,0.6389,0.6358,0.6278,0.6281]},
        "U-Net":       {steps:ST_,sr:[70.34,72.92,73.2,73.8,73.86,73.95,74.01,74.06,74.06,74.06],sr_std:[18.74,18.99,18.67,18.43,18.41,18.39,18.32,18.25,18.25,18.25],time:[0.7351,0.9058,1.0597,1.5493,1.8858,2.2077,2.5374,2.8584,3.1877,3.5113],time_std:[0.5225,0.5231,0.5066,0.5113,0.5385,0.5485,0.5371,0.5323,0.5315,0.5251]},
        "Transformer": {steps:ST_,sr:[68.3,70.27,71.01,71.06,71.42,71.37,71.48,71.48,71.48,71.48],sr_std:[18.67,18.71,18.47,18.45,18.59,18.54,18.51,18.51,18.51,18.51],time:[0.6965,0.829,0.9738,1.3469,1.6056,1.8674,2.1309,2.3906,2.6465,2.9015],time_std:[0.5863,0.5947,0.6381,0.5994,0.6036,0.6087,0.6189,0.62,0.6178,0.613]},
        "DiT":         {steps:ST_,sr:[71.77,73.61,74.55,75.15,75.26,75.32,75.32,75.32,75.37,75.37],sr_std:[16.98,16.89,16.93,16.75,16.77,16.72,16.61,16.61,16.56,16.56],time:[0.7355,0.7985,0.9112,1.2376,1.444,1.6614,1.8758,2.0891,2.3079,2.523],time_std:[0.6668,0.5692,0.5763,0.5579,0.5367,0.5339,0.5396,0.5322,0.5234,0.5262]}
      }
    }
  };

  // ── SVG Line Chart builder ────────────────────────────────────────────────

  var L = {top:18, right:18, bottom:38, left:46}; // margins

  // Auto-compute y-axis range from series data.
  // lo/hi stay tight to data ± padding so no series starts at the axis edge.
  // Gridlines are placed on nice round numbers WITHIN [lo, hi].
  function autoYRange(series, ykey, padFrac) {
    padFrac = padFrac || 0.08;
    var dmin = Infinity, dmax = -Infinity;
    series.forEach(function(s) {
      var arr = s[ykey || "y"] || s.y;
      arr.forEach(function(v, i) {
        var sd = (s.std && s.std.length) ? s.std[i] : 0;
        var lo = v - sd;
        var hi = v + sd;
        if (lo < dmin) dmin = lo;
        if (hi > dmax) dmax = hi;
      });
    });
    var span = dmax - dmin || 1;
    var lo = dmin - span * padFrac;
    var hi = dmax + span * padFrac;
    // Keep positive-only charts from wasting space below zero while still
    // leaving room for the full uncertainty band above the mean.
    if (dmin >= 0 && lo < 0) lo = 0;

    // grid: nice step covering [lo, hi] with ~4-5 ticks
    var rawStep = (hi - lo) / 4;
    var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    var step = Math.ceil(rawStep / mag) * mag;
    var gridStart = Math.ceil(lo / step) * step;
    var grid = [];
    for (var v = gridStart; v <= hi + 1e-9; v = Math.round((v + step) * 1e6) / 1e6) grid.push(v);
    return { lo: lo, hi: hi, grid: grid };
  }

  function makeScale(domain, range, log) {
    var dmin=domain[0], dmax=domain[1], rmin=range[0], rmax=range[1];
    if (log) {
      var lmin=Math.log(dmin), lmax=Math.log(dmax);
      return function(v){ return rmin + (Math.log(v)-lmin)/(lmax-lmin)*(rmax-rmin); };
    }
    return function(v){ return rmin + (v-dmin)/(dmax-dmin)*(rmax-rmin); };
  }

  function buildSVGChart(el, spec) {
    var PL = 54, PR = 18, PT = 18, PB = 42;
    var PW = 520, PH = 242;
    var W = PL + PW + PR, H = PT + PH + PB;
    var NS = "http://www.w3.org/2000/svg";

    function mk(tag, attrs, parent) {
      var node = document.createElementNS(NS, tag);
      Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      if (parent) parent.appendChild(node);
      return node;
    }
    function label(text, attrs, parent) {
      var node = mk("text", attrs, parent);
      node.textContent = text;
      return node;
    }
    function px(v) { return spec.xscale(v); }
    function py(v) { return spec.yscale(v); }
    function pathPoints(xs, ys) {
      return xs.map(function (x, i) {
        return px(x).toFixed(1) + "," + py(ys[i]).toFixed(1);
      }).join(" ");
    }

    var svg = mk("svg", { viewBox: "0 0 " + W + " " + H, class: "lc-svg" }, el);
    var g = mk("g", { transform: "translate(" + PL + "," + PT + ")" }, svg);

    // Background and axes.
    mk("rect", { x: 0, y: 0, width: PW, height: PH, fill: "#fff" }, g);
    mk("line", { x1: 0, y1: PH, x2: PW, y2: PH, stroke: "#c8cdd3", "stroke-width": 1.2 }, g);
    mk("line", { x1: 0, y1: 0, x2: 0, y2: PH, stroke: "#c8cdd3", "stroke-width": 1.2 }, g);

    // Grid and tick labels.
    spec.ygrid.forEach(function (v) {
      var y = py(v);
      if (y < -0.5 || y > PH + 0.5) return;
      mk("line", { x1: 0, y1: y.toFixed(1), x2: PW, y2: y.toFixed(1), stroke: "#e5e7eb", "stroke-width": 0.8 }, g);
      label(spec.yfmt(v), {
        x: -7, y: y.toFixed(1), "text-anchor": "end", "dominant-baseline": "middle",
        "font-size": 9.5, fill: "#6b7280"
      }, g);
    });
    spec.xgrid.forEach(function (v) {
      var x = px(v);
      if (x < -0.5 || x > PW + 0.5) return;
      mk("line", { x1: x.toFixed(1), y1: 0, x2: x.toFixed(1), y2: PH, stroke: "#eef0f3", "stroke-width": 0.8 }, g);
      label(spec.xfmt(v), {
        x: x.toFixed(1), y: PH + 15, "text-anchor": "middle",
        "font-size": 9.5, fill: "#6b7280"
      }, g);
    });

    label(spec.xlabel, { x: PW / 2, y: PH + 34, "text-anchor": "middle", "font-size": 10, fill: "#4b5563" }, g);
    label(spec.ylabel, {
      x: -PH / 2, y: -40, "text-anchor": "middle", "font-size": 10,
      fill: "#4b5563", transform: "rotate(-90)"
    }, g);

    // Draw uncertainty bands first, then the main polylines.
    spec.series.forEach(function (s) {
      if (s.std && s.std.length) {
        var upper = s.x.map(function (x, i) {
          var y = Math.min(s.y[i] + s.std[i], spec.yhi !== undefined ? spec.yhi : Infinity);
          return px(x).toFixed(1) + "," + py(y).toFixed(1);
        });
        var lower = s.x.slice().reverse().map(function (x, i) {
          var j = s.x.length - 1 - i;
          var y = Math.max(s.y[j] - s.std[j], spec.ylo !== undefined ? spec.ylo : -Infinity);
          return px(x).toFixed(1) + "," + py(y).toFixed(1);
        });
        mk("polygon", { points: upper.concat(lower).join(" "), fill: s.color, opacity: 0.12 }, g);
      }
      mk("polyline", {
        points: pathPoints(s.x, s.y), fill: "none", stroke: s.color,
        "stroke-width": 2.2, "stroke-dasharray": s.dash || "none",
        "stroke-linecap": "round", "stroke-linejoin": "round"
      }, g);
      s.x.forEach(function (x, i) {
        mk("circle", { cx: px(x).toFixed(1), cy: py(s.y[i]).toFixed(1), r: 2.2, fill: s.color, stroke: "#fff", "stroke-width": 1 }, g);
      });
    });

    // Minimal hover: nearest x-value across the first series.
    var hair = mk("line", {
      x1: 0, y1: 0, x2: 0, y2: PH, stroke: "#9ca3af", "stroke-width": 1,
      "stroke-dasharray": "4,3", opacity: 0, "pointer-events": "none"
    }, g);
    var hit = mk("rect", { x: 0, y: 0, width: PW, height: PH, fill: "transparent", cursor: "crosshair" }, g);
    var tip = document.createElement("div");
    tip.className = "lc-tooltip";
    el.appendChild(tip);

    hit.addEventListener("mousemove", function (e) {
      var r = svg.getBoundingClientRect();
      var mx = (e.clientX - r.left) * W / r.width - PL;
      var best = 0, dist = Infinity;
      spec.series[0].x.forEach(function (x, i) {
        var d = Math.abs(px(x) - mx);
        if (d < dist) { dist = d; best = i; }
      });
      var hx = px(spec.series[0].x[best]);
      hair.setAttribute("x1", hx.toFixed(1));
      hair.setAttribute("x2", hx.toFixed(1));
      hair.setAttribute("opacity", "1");

      var html = "<b>" + spec.xfmt(spec.series[0].x[best]) + "</b><br>";
      spec.series.forEach(function (s) {
        html += "<span style='color:" + s.color + ";font-size:1.1em'>&#9632;</span> " +
          s.label + ": <b>" + s.y[best].toFixed(1) + (spec.yunit || "") + "</b>" +
          (s.std && s.std[best] ? " ±" + s.std[best].toFixed(2) : "") + "<br>";
      });
      tip.innerHTML = html;
      tip.style.left = Math.min(Math.max(PL + hx + 10, 8), W - 180) + "px";
      tip.style.top = (PT + 8) + "px";
      tip.style.opacity = "1";
    });
    hit.addEventListener("mouseleave", function () {
      hair.setAttribute("opacity", "0");
      tip.style.opacity = "0";
    });

    el._lcSVG = svg;
    return svg;
  }

  function activateLC(el) {
    if(el && el._lcSVG) { el._lcSVG.style.opacity="1"; }
  }

  function buildTTSHeatmap(el) {
    var sampleIndices=[0,2,4,6,8,9,11,13,15,18];
    var ns=sampleIndices.map(function(i){return NS_[i];});
    var W=760,H=354,left=112,top=35,cellW=55,cellH=58,legendX=680;
    var wrap=document.createElement("div");
    wrap.className="lc-wrap tts-heatmap-wrap";
    el.appendChild(wrap);
    var tip=document.createElement("div");
    tip.className="lc-tooltip";
    wrap.appendChild(tip);

    function node(tag,attrs,parent) {
      var n=document.createElementNS("http://www.w3.org/2000/svg",tag);
      Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k]);});
      (parent||svg).appendChild(n);
      return n;
    }
    function textNode(value,attrs,parent) {
      var n=node("text",attrs,parent); n.textContent=value; return n;
    }
    function color(value) {
      var stops=[[62,184,109,116],[68,229,185,179],[72,247,242,239],[76,116,190,194]];
      for(var i=0;i<stops.length-1;i++) {
        if(value<=stops[i+1][0]) {
          var a=stops[i],b=stops[i+1],t=(value-a[0])/(b[0]-a[0]);
          return "rgb("+[1,2,3].map(function(j){return Math.round(a[j]+(b[j]-a[j])*t);}).join(",")+")";
        }
      }
      return "rgb(116,190,194)";
    }
    function showTip(e,arch,n,success,time) {
      tip.innerHTML="<b>"+arch+" · N="+n+"</b><br>Success rate: <b>"+success.toFixed(1)+"%</b><br>Time-to-solution: <b>"+time.toFixed(2)+"s</b>";
      var r=wrap.getBoundingClientRect();
      tip.style.left=Math.max(8,Math.min(e.clientX-r.left+12,r.width-190))+"px";
      tip.style.top=Math.max(e.clientY-r.top-82,4)+"px";
      tip.style.opacity="1";
    }

    var svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 "+W+" "+H);
    svg.setAttribute("class","lc-svg tts-heatmap");
    svg.setAttribute("role","img");
    svg.setAttribute("aria-label","Interactive heatmap of success rate and time-to-solution by policy architecture and sample count");
    wrap.insertBefore(svg,tip);

    var defs=node("defs",{},svg),grad=node("linearGradient",{id:"tts-gradient",x1:"0",y1:"1",x2:"0",y2:"0"},defs);
    [[0,"rgb(184,109,116)"],[0.43,"rgb(229,185,179)"],[0.71,"rgb(247,242,239)"],[1,"rgb(116,190,194)"]].forEach(function(s){node("stop",{offset:(s[0]*100)+"%","stop-color":s[1]},grad);});

    ns.forEach(function(n,c){
      textNode(n,{x:left+c*cellW+cellW/2,y:top+4*cellH+23,"text-anchor":"middle","font-size":12,fill:"#4b5563"},svg);
    });
    textNode("N (sampled candidates)",{x:left+5*cellW,y:top+4*cellH+48,"text-anchor":"middle","font-size":12,fill:"#4b5563"},svg);
    textNode("Policy head",{x:22,y:top+2*cellH,transform:"rotate(-90 22 "+(top+2*cellH)+")","text-anchor":"middle","font-size":12,fill:"#4b5563"},svg);

    ARCH_ORDER.forEach(function(arch,r){
      textNode(arch,{x:left-10,y:top+r*cellH+cellH/2,"text-anchor":"end","dominant-baseline":"middle","font-size":13,fill:"#374151"},svg);
      var d=LINE_DATA.bon.FMP[arch];
      sampleIndices.forEach(function(idx,c){
        var success=d.sr[idx],time=d.time[idx],x=left+c*cellW,y=top+r*cellH;
        var g=node("g",{class:"tts-cell",tabindex:"0",role:"button","aria-label":arch+", N="+NS_[idx]+", "+success.toFixed(1)+" percent success, "+time.toFixed(2)+" seconds"},svg);
        node("rect",{x:x+1,y:y+1,width:cellW-2,height:cellH-2,rx:4,fill:color(success)},g);
        textNode(Math.round(success)+"%",{x:x+cellW/2,y:y+24,"text-anchor":"middle","font-size":13,"font-weight":700,fill:success<69?"#fff":"#27313a"},g);
        textNode(time.toFixed(2)+"s",{x:x+cellW/2,y:y+43,"text-anchor":"middle","font-size":10,fill:success<67?"#fff":"#59636e"},g);
        g.addEventListener("mousemove",function(e){showTip(e,arch,NS_[idx],success,time);});
        g.addEventListener("mouseleave",function(){tip.style.opacity="0";});
        g.addEventListener("focus",function(){
          var rect=g.getBoundingClientRect(); showTip({clientX:rect.left+rect.width/2,clientY:rect.top},arch,NS_[idx],success,time);
        });
        g.addEventListener("blur",function(){tip.style.opacity="0";});
      });
    });

    node("rect",{x:legendX,y:top,width:14,height:4*cellH,rx:3,fill:"url(#tts-gradient)"},svg);
    [62,64,66,68,70,72,74,76].forEach(function(v){
      var y=top+(76-v)/14*4*cellH;
      node("line",{x1:legendX+14,y1:y,x2:legendX+19,y2:y,stroke:"#6b7280"},svg);
      textNode(v,{x:legendX+23,y:y+4,"font-size":10,fill:"#6b7280"},svg);
    });
    textNode("Success rate (%)",{x:legendX+52,y:top+2*cellH,transform:"rotate(90 "+(legendX+52)+" "+(top+2*cellH)+")","text-anchor":"middle","font-size":11,fill:"#4b5563"},svg);
    wrap._lcSVG=svg;
  }

  function buildLineChartEl(el) {
    var key=el.getAttribute("data-linechart");
    if(!key) return;

    if(key==="tts") { buildTTSHeatmap(el); return; }

    var tabs, wrap;

    function render(tabSpec) {
      el.innerHTML="";
      tabs=document.createElement("div"); tabs.className="fmp-metric-tabs"; el.appendChild(tabs);
      tabSpec.forEach(function(t,i){
        var btn=document.createElement("button");
        btn.className="fmp-metric-tab"+(i===0?" active":"");
        btn.textContent=t.label;
        btn.addEventListener("click",function(){
          tabSpec.forEach(function(_,j){ tabs.children[j].classList.remove("active"); });
          btn.classList.add("active");
          wrap.innerHTML="";
          drawPanel(t,wrap);
          activateLC(wrap);
        });
        tabs.appendChild(btn);
      });
      // legend
      var leg=document.createElement("div"); leg.className="fmp-legend"; el.appendChild(leg);
      tabSpec[0].legendItems.forEach(function(li){
        var item=document.createElement("span"); item.className="fmp-legend-item";
        var sw=document.createElement("span"); sw.className="fmp-legend-swatch";
        sw.style.background=li.color;
        if(li.dash&&li.dash!=="none") sw.style.backgroundImage="repeating-linear-gradient(90deg,"+li.color+" 0,"+li.color+" 5px,transparent 5px,transparent 8px)";
        item.appendChild(sw); item.appendChild(document.createTextNode(li.label));
        leg.appendChild(item);
      });
      wrap=document.createElement("div"); wrap.className="lc-wrap"; wrap.id="lc-"+key+"-wrap"; el.appendChild(wrap);
      var tip=document.createElement("div"); tip.className="lc-tooltip"; wrap.appendChild(tip);
      drawPanel(tabSpec[0],wrap);
      el._lcKey=key;
    }

    function drawPanel(t,w) { w.innerHTML=""; buildSVGChart(w,t); }

    // ── Best-of-N panels ────────────────────────────────────────────────────
    if(key==="bon") {
      function bonSRPanel(model,styles) {
        var series=ARCH_ORDER.map(function(a){
          var d=LINE_DATA.bon[model][a];
          return {x:d.ns,y:d.sr,color:styles[a].color,dash:styles[a].dash,label:styles[a].label};
        });
        var yr=autoYRange(series,"y");
        return {label:model+" Success Rate ↑",legendItems:ARCH_ORDER.map(function(a){return {color:styles[a].color,dash:styles[a].dash,label:styles[a].label};}),
          xlabel:"N (sampled candidates)",ylabel:"Success Rate (%)",yunit:"%",
          xscale:makeScale([10,200],[0,520],false),
          yscale:makeScale([yr.lo,yr.hi],[242,0],false),
          xgrid:[10,50,100,150,200],xfmt:function(v){return "N="+v;},
          ygrid:yr.grid,yfmt:function(v){return v+"%";},
          series:series};
      }
      function bonTimePanel(model,styles) {
        var series=ARCH_ORDER.map(function(a){
          var d=LINE_DATA.bon[model][a];
          return {x:d.ns,y:d.time,std:d.time_std,color:styles[a].color,dash:styles[a].dash,label:styles[a].label};
        });
        var yr=autoYRange(series,"y",0.05);
        return {label:model+" Planning Time ↓",legendItems:ARCH_ORDER.map(function(a){return {color:styles[a].color,dash:styles[a].dash,label:styles[a].label};}),
          xlabel:"N (sampled candidates)",ylabel:"Planning Time (s)",yunit:"s",ylo:yr.lo,
          xscale:makeScale([10,200],[0,520],false),
          yscale:makeScale([yr.lo,yr.hi],[242,0],false),
          xgrid:[10,50,100,150,200],xfmt:function(v){return "N="+v;},
          ygrid:yr.grid,yfmt:function(v){return v+"s";},
          series:series};
      }
      render([
        bonSRPanel("FMP",ARCH_LINE),
        bonSRPanel("DMP",ARCH_LINE_DMP),
        bonTimePanel("FMP",ARCH_LINE),
        bonTimePanel("DMP",ARCH_LINE_DMP)
      ]);
    }

    // ── Inference Steps panels ──────────────────────────────────────────────
    if(key==="steps") {
      function stepPanel(nkey, ykey, ysdkey, ylabel, yunit) {
        var series=ARCH_ORDER.map(function(a){
          var d=LINE_DATA.steps[nkey][a];
          return {x:d.steps,y:d[ykey],std:(ysdkey?d[ysdkey]:null),color:ARCH_LINE[a].color,label:ARCH_LINE[a].label};
        });
        var yr=autoYRange(series,"y",0.06);
        var fmt = yunit==="%"
          ? function(v){return v+"%";}
          : function(v){return v+"s";};
        return {label:(nkey==="N1"?"N=1":"N=100")+" — "+ylabel,
          legendItems:ARCH_ORDER.map(function(a){return {color:ARCH_LINE[a].color,label:ARCH_LINE[a].label};}),
          xlabel:"Euler Integration Steps",ylabel:ylabel,yunit:yunit,
          ylo: ysdkey ? yr.lo : undefined,
          xscale:makeScale([5,90],[0,520],false),
          yscale:makeScale([yr.lo,yr.hi],[242,0],false),
          xgrid:[5,15,30,50,70,90],xfmt:function(v){return v+"";},
          ygrid:yr.grid,yfmt:fmt,
          series:series};
      }
      render([
        stepPanel("N1","sr",null,"Success Rate ↑","%"),
        stepPanel("N100","sr",null,"Success Rate ↑","%"),
        stepPanel("N1","time","time_std","Planning Time ↓","s"),
        stepPanel("N100","time","time_std","Planning Time ↓","s")
      ]);
    }
  }

  // 5. SCROLL ANIMATIONS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Sortable table ────────────────────────────────────────────────────────
  function initSortableTables() {
    document.querySelectorAll("th.div-sort").forEach(function (th) {
      var asc = true;
      th.addEventListener("click", function () {
        var col  = parseInt(th.getAttribute("data-col"), 10);
        var tbody = document.getElementById("diversity-body");
        if (!tbody) return;
        var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
        rows.sort(function (a, b) {
          var av = a.querySelectorAll("td")[col].textContent.trim();
          var bv = b.querySelectorAll("td")[col].textContent.trim();
          var an = parseFloat(av), bn = parseFloat(bv);
          var cmp = isNaN(an) || isNaN(bn) ? av.localeCompare(bv) : an - bn;
          return asc ? cmp : -cmp;
        });
        asc = !asc;
        // update arrows
        document.querySelectorAll("th.div-sort .sort-arrow").forEach(function (s) { s.textContent = "⇅"; });
        th.querySelector(".sort-arrow").textContent = asc ? "↓" : "↑";
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
  }

  // ── Section-level tab switching ──────────────────────────────────────────
  function initSecTabs() {
    document.querySelectorAll(".sec-tab-nav").forEach(function (nav) {
      var btns   = nav.querySelectorAll(".sec-tab");
      var parent = nav.parentElement;

      function activate(btn) {
        btns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var targetId = btn.getAttribute("data-panel");
        parent.querySelectorAll(".sec-panel").forEach(function (p) {
          if (p.id === targetId) {
            p.classList.remove("sec-panel-hidden");
            // Trigger bar animations for any bar charts inside this panel
            p.querySelectorAll(".fmp-bar-chart").forEach(function (c) {
              c.classList.add("in-view");
            });
            // Trigger line chart animations
            p.querySelectorAll(".lc-wrap").forEach(function (w) {
              activateLC(w);
            });
          } else {
            p.classList.add("sec-panel-hidden");
          }
        });
      }

      btns.forEach(function (btn) {
        btn.addEventListener("click", function () { activate(btn); });
      });
    });
  }

  function initAll() {
    // Main metrics chart
    document.querySelectorAll(".fmp-bar-chart[data-metric]").forEach(buildMainChart);
    // Named ablation charts
    document.querySelectorAll(".fmp-bar-chart[data-chart]").forEach(buildNamedChart);
    // Section-level tabs
    initSecTabs();
    // Sortable tables
    initSortableTables();
    // Line charts
    document.querySelectorAll(".fmp-line-chart").forEach(buildLineChartEl);
    // Animate line charts when they scroll into view (via sec-tab activation too)
    var lineEls = document.querySelectorAll(".fmp-line-chart");
    if ("IntersectionObserver" in window) {
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { activateLC(e.target.querySelector(".lc-wrap")); lio.unobserve(e.target); }
        });
      }, { threshold: 0.15 });
      lineEls.forEach(function (c) { lio.observe(c); });
    } else {
      lineEls.forEach(function (c) { activateLC(c.querySelector(".lc-wrap")); });
    }

    // Scroll-grow bars (for charts outside section tabs, e.g. main results chart)
    var allCharts = document.querySelectorAll(".fmp-bar-chart");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
        });
      }, { threshold: 0.1 });
      allCharts.forEach(function (c) { io.observe(c); });
    } else {
      allCharts.forEach(function (c) { c.classList.add("in-view"); });
    }

    // Section reveal
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var blocks = document.querySelectorAll(".reveal-block");
    if (reduce || !("IntersectionObserver" in window)) {
      blocks.forEach(function (b) { b.classList.add("is-visible"); }); return;
    }
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); rio.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    blocks.forEach(function (b) { rio.observe(b); });
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", initAll); }
  else { initAll(); }
})();
