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
    const M1 = -(w * L1 ** 3 + w * L2 ** 3) / (8 * (L1 + L2));
    const R1 = M1 / L1 + (w * L1) / 2;
    const R3 = M1 / L2 + (w * L2) / 2;
    const R2 = w * (L1 + L2) - R1 - R3;

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

  getShearForce(beam, load, condition, j2) {
    const analyzer = this.analyzer[condition];
    if (analyzer) {
      const span =
        condition === "simply-supported"
          ? beam.primarySpan
          : beam.primarySpan + beam.secondarySpan;
      return this.computeData(
        analyzer.getShearForceEquation(beam, load, j2),
        span
      );
    }
    throw new Error("Invalid condition");
  }

  getBendingMoment(beam, load, condition, j2) {
    const analyzer = this.analyzer[condition];
    if (analyzer) {
      const span =
        condition === "simply-supported"
          ? beam.primarySpan
          : beam.primarySpan + beam.secondarySpan;
      return this.computeData(
        analyzer.getBendingMomentEquation(beam, load, j2),
        span
      );
    }
    throw new Error("Invalid condition");
  }

  getDeflection(beam, load, condition, j2) {
    const analyzer = this.analyzer[condition];
    if (analyzer) {
      const span =
        condition === "simply-supported"
          ? beam.primarySpan
          : beam.primarySpan + beam.secondarySpan;
      return this.computeData(
        analyzer.getDeflectionEquation(beam, load, j2),
        span
      );
    }
    throw new Error("Invalid condition");
  }

  computeData(equation, span) {
    const data = [];
    for (let x = 0; x <= span; x += span / 100) {
      data.push(equation(x));
    }
    return data;
  }
}

BeamAnalysis.analyzer = {
  simplySupported: class {
    getDeflectionEquation(beam, load, j2) {
      return (x) => {
        const L = beam.primarySpan;
        const EI = beam.material.properties.EI;
        // return {
        //   x,
        //   y: ((load * x ** 2 * (3 * L - x)) / (6 * EI)) * j2,
        // };

        if (x > L) {
          return { x, y: 0 };
        }

        const y =
          -((load * x) / (24 * EI)) *
          (L ** 3 - 2 * L * x ** 2 + x ** 3) *
          j2 *
          1000;

        if (isNaN(y) || !isFinite(y)) {
          return { x, y: 0 };
        }

        return { x, y };
      };
    }
    getBendingMomentEquation(beam, load, j2) {
      return (x) => {
        const L = beam.primarySpan;
        return {
          x,
          y: ((load * x * (L - x)) / 2) * j2,
        };
      };
    }
    getShearForceEquation(beam, load, j2) {
      return (x) => {
        const L = beam.primarySpan;
        return {
          x,
          y: load * (L / 2 - x) * j2,
        };
      };
    }
  },
  twoSpanUnequal: class {
    // getDeflectionEquation(beam, load, j2) {
    //   const { primarySpan: L1, secondarySpan: L2, material } = beam;
    //   const EI = material.properties.EI / Math.pow(1000, 3); // Convert EI to kN-m²
    //   const L = L1 + L2;

    //   if (!beam.R1 || !beam.R2 || !beam.R3) {
    //     beam.calculateConstants(load, L1, L2); // Ensure R1, R2, and R3 are calculated
    //   }

    //   return (x) => {
    //     if (x > L) return { x, y: 0 }; // Outside beam length
    //     let y;

    //     if (x <= L1) {
    //       // For 0 <= x <= L1
    //       y =
    //         (x / (24 * EI)) *
    //         (4 * beam.R1 * Math.pow(x, 2) -
    //           load * Math.pow(x, 3) +
    //           load * Math.pow(L1, 3) -
    //           4 * beam.R1 * Math.pow(L1, 2)) *
    //         1000 *
    //         Math.pow(j2, 2);
    //     } else {
    //       // For L1 < x <= L (L = L1 + L2)
    //       y =
    //         ((beam.R1 * x * (Math.pow(x, 2) - Math.pow(L1, 2))) / 6 +
    //           (beam.R2 *
    //             x *
    //             (Math.pow(x, 2) - 3 * L1 * x + 3 * Math.pow(L1, 2))) /
    //             6 -
    //           (beam.R2 * Math.pow(L1, 3)) / 6 -
    //           (load * (Math.pow(x, 3) - Math.pow(L1, 3))) / 24) *
    //         (1 / EI) *
    //         1000 *
    //         Math.pow(j2, 2);
    //     }

    //     return { x, y: isFinite(y) ? y : 0 }; // Ensure finite result
    //   };
    // }

    getDeflectionEquation(beam, load, j2) {
      const { primarySpan: L1, secondarySpan: L2, material } = beam;
      const EI = material.properties.EI / 1e9; // Convert EI from N-mm² to kN-m²
      const L = L1 + L2; // Total span

      if (!beam.R1 || !beam.R2 || !beam.R3) {
        beam.calculateConstants(load, L1, L2);
      }

      return (x) => {
        if (x > L) return { x, y: 0 }; // Beyond total span

        let y = 0;
        if (x <= L1) {
          // Apply formula for δ1 (x1 to L1)
          y =
            (x / (24 * EI)) *
            (4 * beam.R1 * x ** 2 -
              load * x ** 3 +
              load * L1 ** 3 -
              4 * beam.R1 * L1 ** 2) *
            1000 *
            j2;
        } else {
          // Apply formula for δ2 (L1 to L1 + L2)
          y =
            ((((beam.R1 * x) / 6) * (x ** 2 - L1 ** 2) +
              ((beam.R2 * x) / 6) * (x ** 2 - 3 * L1 * x + 3 * L1 ** 2) -
              (beam.R2 * L1 ** 3) / 6 -
              (load / 24) * (x ** 3 - L1 ** 3)) /
              EI) *
            1000 *
            j2;
        }

        if (isNaN(y) || !isFinite(y)) {
          return { x, y: 0 };
        }

        return { x, y };
      };
    }

    getBendingMomentEquation(beam, load, j2) {
      const { primarySpan: L1, secondarySpan: L2 } = beam;
      const L = L1 + L2;

      return (x) => {
        if (x > L) return { x, y: 0 };
        let y = 0;
        if (x <= L1) {
          y = beam.R1 * x - (load * x ** 2) / 2;
        } else {
          y = beam.R1 * x + beam.R2 * (x - L1) - (load * x ** 2) / 2;
        }
        return { x, y: y * j2 };
      };
    }

    getShearForceEquation(beam, load, j2) {
      const { primarySpan: L1, secondarySpan: L2 } = beam;
      const L = L1 + L2;

      return (x) => {
        if (x > L) return { x, y: 0 };
        let y = 0;
        if (x <= L1) {
          y = beam.R1 - load * x;
        } else {
          y = beam.R1 + beam.R2 - load * x;
        }
        return { x, y: y * j2 };
      };
    }
  },
};
