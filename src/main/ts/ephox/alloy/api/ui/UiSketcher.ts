import { Objects } from '@ephox/boulder';
import { Merger } from '@ephox/katamari';

import { AdtInterface } from '../../alien/TypeDefinitions';
import * as AlloyParts from '../../parts/AlloyParts';
import * as Tagger from '../../registry/Tagger';
import * as SpecSchema from '../../spec/SpecSchema';
import { SimpleSpec, SketchSpec, RawDomSchema, SimpleOrSketchSpec, AlloySpec } from '../../api/component/SpecTypes';

export type SingleFactory = (detail: SpecSchema.SpecSchemaStruct, specWithUid: SimpleSpec) => SketchSpec;
export type CompositeFactory = (
  detail: SpecSchema.SpecSchemaStruct,
  components: AlloySpec[],
  spec: SimpleSpec,
  _externals?: any
) => SketchSpec;

const single = function (owner: string, schema: AdtInterface[], factory: SingleFactory, spec: SimpleOrSketchSpec): SketchSpec {
  const specWithUid = supplyUid(spec);
  const detail = SpecSchema.asStructOrDie(owner, schema, specWithUid, [ ], [ ]);
  return Merger.deepMerge(
    factory(detail, specWithUid),
    { 'debug.sketcher': Objects.wrap(owner, spec) }
  );
};

const composite = function (owner: string, schema: AdtInterface[], partTypes: AdtInterface[], factory: CompositeFactory, spec: SimpleOrSketchSpec): SketchSpec {
  const specWithUid = supplyUid(spec);

  // Identify any information required for external parts
  const partSchemas = AlloyParts.schemas(partTypes);

  // Generate partUids for all parts (external and otherwise)
  const partUidsSchema = AlloyParts.defaultUidsSchema(partTypes);

  const detail = SpecSchema.asStructOrDie(owner, schema, specWithUid, partSchemas, [ partUidsSchema ]);

  // Create (internals, externals) substitutions
  const subs = AlloyParts.substitutes(owner, detail, partTypes);

  // Work out the components by substituting internals
  const components = AlloyParts.components(owner, detail, subs.internals());

  return Merger.deepMerge(
    // Pass through the substituted components and the externals
    factory(detail, components, specWithUid, subs.externals()),
    { 'debug.sketcher': Objects.wrap(owner, spec) }
  );
};

const supplyUid = function (spec: SimpleOrSketchSpec): SketchSpec {
  return Merger.deepMerge(
    {
      uid: Tagger.generate('uid')
    }, spec
  );
};

export {
  supplyUid,
  single,
  composite
};