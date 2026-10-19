import { mergePluginData, type KiwiNodeChange } from '@open-pencil/fig/node-change'
import type { SceneGraph } from '@open-pencil/scene-graph'
import {
  isPluginDataEntry,
  OPEN_PENCIL_PLUGIN_DATA,
  withoutPluginData,
  withPluginData
} from '@open-pencil/scene-graph/plugin-data'

const { enabledLibraries } = OPEN_PENCIL_PLUGIN_DATA

export function applyEnabledLibrariesPluginData(
  documentNodeChange: KiwiNodeChange,
  graph: SceneGraph
): void {
  const rootPluginData = graph.getNode(graph.rootId)?.pluginData ?? []
  const bindings = [...graph.enabledLibraries.values()]
  // With no libraries enabled, the entry the document was opened with is kept as it was.
  const opened = rootPluginData.find((entry) => isPluginDataEntry(entry, enabledLibraries))
  documentNodeChange.pluginData = mergePluginData(
    bindings.length > 0
      ? withPluginData(rootPluginData, enabledLibraries, bindings)
      : [...withoutPluginData(rootPluginData, [enabledLibraries]), ...(opened ? [opened] : [])]
  )
}
