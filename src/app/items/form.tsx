"use client";
import React from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { FaPlus, FaTrash } from "react-icons/fa";
import { FaArrowRightFromBracket } from "react-icons/fa6";

interface Item {
  itemName: string;
  kWh: number;
  quantity: number;
}

interface FormValues {
  items: Item[];
}

const ItemForm: React.FC = () => {
  const { control, register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      items: [{ itemName: "", kWh: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    console.log(data);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)}>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col md:flex-row flex-grow gap-2 rounded-md mb-2"
          >
            <div className="flex flex-col">
              <label htmlFor="">Item</label>
              <input
                {...register(`items.${index}.itemName` as const, {
                  required: true,
                })}
                placeholder=""
                className="p-2 rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="">kWh</label>
              <input
                type="number"
                {...register(`items.${index}.kWh` as const, {
                  required: true,
                  valueAsNumber: true,
                })}
                placeholder="kWh"
                className="p-2 rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="">Quantity</label>
              <input
                type="number"
                {...register(`items.${index}.quantity` as const, {
                  required: true,
                  valueAsNumber: true,
                })}
                placeholder="Quantity"
                className="p-2 rounded-md"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="">Remove </label>
              <button
                type="button"
                onClick={() => remove(index)}
                className="flex flex-inline bg-red-300 rounded-md justify-center items-center p-3 gap-2"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
        <div className="flex flex-row gap-2 pt-2">
          <div>
            <button
              type="button"
              onClick={() => append({ itemName: "", kWh: 0, quantity: 1 })}
              className="flex flex-inline bg-gray-300 rounded-md justify-center items-center p-2 gap-2"
            >
              <FaPlus />
              <label htmlFor="">Add Item</label>
            </button>
          </div>
          <div>
            <button
              type="submit"
              className="flex flex-inline bg-blue-300 rounded-md justify-center items-center p-2 gap-2"
            >
              <FaArrowRightFromBracket />
              Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ItemForm;
