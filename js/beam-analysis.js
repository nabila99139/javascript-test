"use strict";

// class Material {
//   constructor(name, properties) {
//     this.name = name;
//     this.properties = properties;
//   }
// }
class Material {
  constructor(properties) {
    this.properties = properties;
  }
}

class Beam {
  constructor(primarySpan, secondarySpan, material) {
    this.primarySpan = primarySpan;
    this.secondarySpan = secondarySpan || primarySpan;
    this.material = material;
  }

  calculateConstants(w, L1, L2) {
    const M1 = -(w * L1 ** 3 + w * L2 ** 3) / (8 * (L1 + L2)); // Rumus M1
    const R1 = M1 / L1 + (w * L1) / 2; // Rumus R1
    const R3 = M1 / L2 + (w * L2) / 2; // Rumus R3
    const R2 = w * (L1 + L2) - R1 - R3; // Rumus R2

    this.R1 = R1;
    this.R2 = R2;
    this.R3 = R3;
    this.M1 = M1;

    console.log("Calculated Constants:", { M1, R1, R2, R3 });
  }
}

class BeamAnalysis {
  constructor() {
    this.analyzer = {
      "simply-supported": new BeamAnalysis.analyzer.simplySupported(),
      "two-span-unequal": new BeamAnalysis.analyzer.twoSpanUnequal(),
    };
  } 

  getShearForce(beam, load, condition) {
    const analyzer = this.analyzer[condition];
    if (analyzer) {
      // For simply supported, use primarySpan, else use both primary and secondary spans
      const span =
        condition === "simply-supported"
          ? beam.primarySpan
          : beam.primarySpan + beam.secondarySpan;
      return this.computeData(analyzer.getShearForceEquation(beam, load), span);
    }
    throw new Error("Invalid condition");
  }

  getBendingMoment(beam, load, condition) {
    const analyzer = this.analyzer[condition];
    if (analyzer) {
      const span =
        condition === "simply-supported"
          ? beam.primarySpan
          : beam.primarySpan + beam.secondarySpan;
      return this.computeData(
        analyzer.getBendingMomentEquation(beam, load),
        span
      );
    }
    throw new Error("Invalid condition");
  }

  getDeflection(beam, load, condition) {
    const analyzer = this.analyzer[condition];
    if (analyzer) {
      const span =
        condition === "simply-supported"
          ? beam.primarySpan
          : beam.primarySpan + beam.secondarySpan;
      return this.computeData(analyzer.getDeflectionEquation(beam, load), span);
    }
    throw new Error("Invalid condition");
  }

  computeData(equation, span) {
    const data = [];
    // Calculate data for a given span
    for (let x = 0; x <= span; x += span / 100) {
      data.push(equation(x));
    }
    return data;
  }
}

BeamAnalysis.analyzer = {
  simplySupported: class {
    getDeflectionEquation(beam, load) {
      return (x) => {
        const L = beam.primarySpan;
        const EI = beam.material.properties.EI;
        return {
          x,
          y: (load * x ** 2 * (3 * L - x)) / (6 * EI),
        };
      };
    }
    getBendingMomentEquation(beam, load) {
      return (x) => {
        const L = beam.primarySpan;
        return {
          x,
          y: (load * x * (L - x)) / 2,
        };
      };
    }
    getShearForceEquation(beam, load) {
      return (x) => {
        const L = beam.primarySpan;
        return {
          x,
          y: load * (L / 2 - x),
        };
      };
    }
  },
  twoSpanUnequal: class {
    getDeflectionEquation(beam, load) {
      const { primarySpan: L1, secondarySpan: L2, material } = beam;
      const EI = material.properties.EI / 1000 ** 3; // Convert EI to kN-m²
      const j2 = parseFloat(document.getElementById("j2").value) || 4;
      const L = L1 + L2; // Total span length

      // Calculate constants only once if not already done
      if (!beam.R1 || !beam.R2 || !beam.R3) {
        beam.calculateConstants(load, L1, L2);
      }

      return (x) => {
        if (x > L) {
          return { x, y: 0 }; // Stop at L
        }

        let y = 0;
        if (x <= L1) {
          // Equation for the first span (S1)
          y =
            (x / (24 * EI)) *
            (4 * beam.R1 * x ** 2 -
              load * x ** 3 +
              load * L1 ** 3 -
              4 * beam.R1 * L1 ** 2) *
            1000 *
            j2;
        } else {
          // Equation for the second span (S2)
          y =
            (((beam.R1 * x) / 6) * (x ** 2 - L1 ** 2) +
              ((beam.R2 * x) / 6) * (x ** 2 - 3 * L1 * x + 3 * L1 ** 2) -
              (beam.R2 * L1 ** 3) / 6 -
              (load / 24) * (x ** 3 - L1 ** 3)) *
            (1 / EI) *
            1000 *
            j2;
        }

        if (isNaN(y) || !isFinite(y)) {
          y = 0; // Set to zero if NaN or Infinity
        }

        return { x, y };
      };
    }

    getBendingMomentEquation(beam, load) {
      const { primarySpan: L1, secondarySpan: L2 } = beam;
      const L = L1 + L2; // Total span length

      return (x) => {
        if (x > L) {
          return { x, y: 0 }; // Stop the equation at x = L
        }

        let y = 0;
        if (x <= L1) {
          y = beam.R1 * x - (load * x ** 2) / 2;
        } else {
          y = beam.R1 * x + beam.R2 * (x - L1) - (load * x ** 2) / 2;
        }
        return { x, y }; // Return the x and y values as an object
      };
    }

    getShearForceEquation(beam, load) {
      const { primarySpan: L1, secondarySpan: L2 } = beam;
      const L = L1 + L2; // Total span length

      return (x) => {
        if (x > L) return { x, y: 0 }; // Stop equation at x = L

        let y = 0;
        if (x <= L1) {
          y = beam.R1 - load * x;
        } else {
          y = beam.R1 + beam.R2 - load * x;
        }

        console.log(`getShearForceEquation | beam ${beam} load ${load} beam.R1 ${beam.R1} beam.R2 ${beam.R2} x ${x}`);
        
        return { x, y };
      };
    }
  },
};
