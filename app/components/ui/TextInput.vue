<template>
  <input
    ref="inputRef"
    :type="type"
    :value="modelValue"
    @input="handleInput"
    class="text-input"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: string;
  }>(),
  {
    type: "text",
    modelValue: "",
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string | number): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = props.type === "number" ? Number(target.value) : target.value;
  emit("update:modelValue", value);
};

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({ focus });
</script>

<style scoped>
.text-input {
  width: 100%;
  background: var(--bg-dark-200);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.text-input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 1px var(--color-primary-dim);
}

.text-input::placeholder {
  color: var(--text-muted);
}

 
.text-input[type="number"]::-webkit-inner-spin-button,
.text-input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.text-input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
