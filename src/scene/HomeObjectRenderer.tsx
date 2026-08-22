import type { ResolvedHomeObject } from '@/home/types';
import { paletteColor } from '@/home/palettes';
import { Bed } from './objects/Bed';
import { BedsideTable, PaneledWardrobe } from './objects/BedroomFurniture';
import { Bench } from './objects/Bench';
import { Bookshelf } from './objects/Bookshelf';
import { DailyMediaConsole } from './objects/DailyMediaConsole';
import { Easel } from './objects/Easel';
import { Fireplace } from './objects/Fireplace';
import { GardenGreenhousePortal } from './objects/GardenGreenhousePortal';
import { Plant } from './objects/Plant';
import { RestNook } from './objects/RestNook';
import { Sofa } from './objects/Sofa';
import { TableSet } from './objects/TableSet';
import { IndoorCatalogObject } from './objects/IndoorCatalogObject';
import { BedroomCatalogObject } from './objects/BedroomCatalogObject';
import { GardenCatalogObject } from './objects/GardenCatalogObject';
import { BlossomTree, GardenLantern, GardenThreshold, KoiPond, RoseBush } from './rooms/Garden';

function UnknownAsset() {
  return (
    <group>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.65, 0.65, 0.65]} />
        <meshBasicMaterial color="#c28a76" wireframe />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.08, 6, 4]} />
        <meshBasicMaterial color="#fff0d5" />
      </mesh>
    </group>
  );
}

function Renderer({ object }: { object: ResolvedHomeObject }) {
  if (object.placeholder) return <UnknownAsset />;
  switch (object.definition.renderer) {
    case 'Fireplace': return (
      <Fireplace
        position={[0, 0, 0]}
        tier={Number(object.definition.progression.tier ?? 1)}
        style={object.style}
      />
    );
    case 'Sofa': return <Sofa position={[0, 0, 0]} />;
    case 'TableSet': return <TableSet position={[0, 0, 0]} />;
    case 'RestNook': return <RestNook position={[0, 0, 0]} />;
    case 'Bed': return <Bed position={[0, 0, 0]} />;
    case 'Easel': return <Easel position={[0, 0, 0]} />;
    case 'DailyMediaConsole': return <DailyMediaConsole />;
    case 'GardenThreshold': return <GardenThreshold />;
    case 'Bookshelf': return <Bookshelf position={[0, 0, 0]} />;
    case 'Plant': return <Plant position={[0, 0, 0]} phase={object.id.length * 0.37} scale={0.4} />;
    case 'BedsideTable': return <BedsideTable position={[0, 0, 0]} />;
    case 'Wardrobe': return <PaneledWardrobe position={[0, 0, 0]} />;
    case 'KoiPond': return (
      <KoiPond
        position={[0, 0.02, 0]}
        waterColor={paletteColor(object.style, 'water', '#70aeb8')}
      />
    );
    case 'BlossomTree': return <BlossomTree position={[0, 0, 0]} />;
    case 'RoseBush': return <RoseBush position={[0, 0, 0]} />;
    case 'GardenLantern': return <GardenLantern position={[0, 0, 0]} />;
    case 'Bench': return <Bench position={[0, 0, 0]} />;
    case 'GardenGreenhousePortal': return (
      <GardenGreenhousePortal position={[0, 0, 0]} style={object.style} />
    );
    case 'IndoorCatalog': return <IndoorCatalogObject object={object} />;
    case 'BedroomCatalog': return <BedroomCatalogObject object={object} />;
    case 'GardenCatalog': return <GardenCatalogObject object={object} />;
    default: return <UnknownAsset />;
  }
}

export function HomeObjectRenderer({ object }: { object: ResolvedHomeObject }) {
  return (
    <group position={object.renderPosition} rotation={[0, object.rotationY, 0]}>
      <Renderer object={object} />
    </group>
  );
}
