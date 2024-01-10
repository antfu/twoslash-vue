import { expect, it } from 'vitest'
import { codeToHtml } from 'shikiji'
import { createTransformerFactory, rendererRich } from 'shikiji-twoslash/core'
import { twoslashVue } from '../src'

const code = `
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)
//     ^?
</script>

<template>
  <button @click="count++">count is: {{ count }}</button>
</template>
`

it('exported', () => {
  const result = twoslashVue(code, 'vue')

  expect(result.queries).toMatchInlineSnapshot(`
    [
      {
        "docs": "",
        "kind": "query",
        "length": 33,
        "line": 6,
        "offset": 11,
        "start": 91,
        "text": "const double: ComputedRef<number>",
      },
    ]
  `)

  expect(result.staticQuickInfos).toMatchInlineSnapshot(`
    [
      {
        "character": 10,
        "docs": "Takes an inner value and returns a reactive and mutable ref object, which
    has a single property \`.value\` that points to the inner value.",
        "length": 3,
        "line": 2,
        "start": 35,
        "targetString": "ref",
        "text": "(alias) function ref<T>(value: T): Ref<UnwrapRef<T>> (+1 overload)
    import ref",
      },
      {
        "character": 15,
        "docs": "",
        "length": 8,
        "line": 2,
        "start": 40,
        "targetString": "computed",
        "text": "(alias) const computed: {
        <T>(getter: ComputedGetter<T>, debugOptions?: DebuggerOptions | undefined): ComputedRef<T>;
        <T>(options: WritableComputedOptions<T>, debugOptions?: DebuggerOptions | undefined): WritableComputedRef<...>;
    }
    import computed",
      },
      {
        "character": 9,
        "docs": "",
        "length": 5,
        "line": 4,
        "start": 69,
        "targetString": "count",
        "text": "const count: Ref<number>",
      },
      {
        "character": 17,
        "docs": "Takes an inner value and returns a reactive and mutable ref object, which
    has a single property \`.value\` that points to the inner value.",
        "length": 3,
        "line": 4,
        "start": 77,
        "targetString": "ref",
        "text": "(alias) ref<number>(value: number): Ref<number> (+1 overload)
    import ref",
      },
      {
        "character": 10,
        "docs": "",
        "length": 6,
        "line": 5,
        "start": 90,
        "targetString": "double",
        "text": "const double: ComputedRef<number>",
      },
      {
        "character": 19,
        "docs": "Takes a getter function and returns a readonly reactive ref object for the
    returned value from the getter. It can also take an object with get and set
    functions to create a writable ref object.",
        "length": 8,
        "line": 5,
        "start": 99,
        "targetString": "computed",
        "text": "(alias) computed<number>(getter: ComputedGetter<number>, debugOptions?: DebuggerOptions | undefined): ComputedRef<number> (+1 overload)
    import computed",
      },
      {
        "character": 34,
        "docs": "",
        "length": 5,
        "line": 5,
        "start": 114,
        "targetString": "count",
        "text": "const count: Ref<number>",
      },
      {
        "character": 40,
        "docs": "",
        "length": 5,
        "line": 5,
        "start": 120,
        "targetString": "value",
        "text": "(property) Ref<number>.value: number",
      },
      {
        "character": 49,
        "docs": undefined,
        "length": 5,
        "line": 10,
        "start": 203,
        "targetString": "count",
        "text": "any",
      },
    ]
  `)
})

it('highlight', async () => {
  const result = await codeToHtml(code, {
    lang: 'vue',
    theme: 'vitesse-light',
    transformers: [
      createTransformerFactory(twoslashVue)({
        langs: ['ts', 'tsx', 'vue'],
        renderer: rendererRich({
          lang: 'ts',
        }),
        throws: false,
      }),
    ],
  })

  expect([
    '<head>',
    `<link rel="stylesheet" href="https://esm.sh/shikiji-twoslash@0.9.18/style-rich.css" />`,
    '</head>',
    result,
  ].join('\n'))
    .toMatchFileSnapshot('./out/example.vue.html')
})
