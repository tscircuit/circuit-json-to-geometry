# circuit-json-to-geometry

Convert [Circuit JSON](https://github.com/tscircuit/circuit-json) to FlattenJS
geometry.

```tsx
import { convertCircuitJsonToGeometry } from "circuit-json-to-geometry"

const layers = convertCircuitJsonToGeometry(circuitJson)

console.log(layers)

/**
{
  topCopper: FlattenJS.Polygon(...),
  bottomCopper: FlattenJS.Polygon(...),
  inner1Copper: FlattenJS.Polygon(...),
  inner2Copper: FlattenJS.Polygon(...),
  topSilkscreen: FlattenJS.Polygon(...),
  bottomSilkscreen: FlattenJS.Polygon(...),
  soldermask: FlattenJS.Polygon(...),
  cutout: FlattenJS.Polygon(...),
}
**/
```
