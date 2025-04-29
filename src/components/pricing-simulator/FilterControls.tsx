
import React from "react";
import Select from "react-select";
import { Label } from "@/components/ui/label";

interface SelectOption {
  label: string;
  value: string;
}

interface FilterControlsProps {
  uniqueTypes: string[];
  uniqueViews: string[];
  uniqueFloors: string[];
  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  selectedViews: string[];
  setSelectedViews: (views: string[]) => void;
  selectedFloors: string[];
  setSelectedFloors: (floors: string[]) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  uniqueTypes,
  uniqueViews,
  uniqueFloors,
  selectedTypes,
  setSelectedTypes,
  selectedViews,
  setSelectedViews,
  selectedFloors,
  setSelectedFloors,
}) => {
  const createOptions = (values: string[]): SelectOption[] =>
    values.map(v => ({ label: v, value: v }));

  const typeOptions = createOptions(uniqueTypes);
  const viewOptions = createOptions(uniqueViews);
  const floorOptions = createOptions(uniqueFloors);

  const createSelectedOptions = (values: string[], options: SelectOption[]) =>
    options.filter(opt => values.includes(opt.value));
    
  // Function to determine menu placement based on the number of options
  const getMenuPlacement = (optionsLength: number) => 
    optionsLength > 10 ? "top" : "auto";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
      <div className="md:col-span-4">
        <Label className="mb-2 block text-sm font-medium text-gray-700">
          Bedroom Types
        </Label>
        <Select
          options={typeOptions}
          value={createSelectedOptions(selectedTypes, typeOptions)}
          onChange={(selected) => 
            setSelectedTypes(selected ? selected.map(s => s.value) : [])
          }
          isMulti
          className="react-select-container"
          classNamePrefix="react-select"
          placeholder="Select bedroom types..."
          menuPlacement={getMenuPlacement(uniqueTypes.length)}
          menuPortalTarget={document.body}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 9999 }),
            menu: base => ({ ...base, zIndex: 9999 })
          }}
        />
      </div>

      <div className="md:col-span-4">
        <Label className="mb-2 block text-sm font-medium text-gray-700">
          Views
        </Label>
        <Select
          options={viewOptions}
          value={createSelectedOptions(selectedViews, viewOptions)}
          onChange={(selected) => 
            setSelectedViews(selected ? selected.map(s => s.value) : [])
          }
          isMulti
          className="react-select-container"
          classNamePrefix="react-select"
          placeholder="Select views..."
          menuPlacement={getMenuPlacement(uniqueViews.length)}
          menuPortalTarget={document.body}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 9999 }),
            menu: base => ({ ...base, zIndex: 9999 })
          }}
        />
      </div>

      <div className="md:col-span-4">
        <Label className="mb-2 block text-sm font-medium text-gray-700">
          Floors
        </Label>
        <Select
          options={floorOptions}
          value={createSelectedOptions(selectedFloors, floorOptions)}
          onChange={(selected) => 
            setSelectedFloors(selected ? selected.map(s => s.value) : [])
          }
          isMulti
          className="react-select-container"
          classNamePrefix="react-select"
          placeholder="Select floors..."
          menuPlacement={getMenuPlacement(uniqueFloors.length)}
          menuPortalTarget={document.body}
          styles={{
            menuPortal: base => ({ ...base, zIndex: 9999 }),
            menu: base => ({ ...base, zIndex: 9999 })
          }}
        />
      </div>
    </div>
  );
};

export default FilterControls;
