"use client";

import { cn } from "@/lib/utils";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "./ui/input-group";
import {
  ChevronDownIcon,
  CornerDownLeftIcon,
  MoreHorizontal,
} from "lucide-react";
import { Spinner } from "./ui/spinner";

interface PropsType {
  promptText: string;
  setPromptText: (value: string) => void;
  isLoading?: boolean;
  className?: string;
  hideSubmitBtn?: boolean;
  onSubmit?: () => void;
  deviceType?: 'mobile' | 'web';
  onDeviceTypeChange?: (type: 'mobile' | 'web') => void;
}
const PromptInput = ({
  promptText,
  setPromptText,
  isLoading,
  className,
  hideSubmitBtn = false,
  onSubmit,
  deviceType = 'mobile',
  onDeviceTypeChange
}: PropsType) => {
  return (
    <div className="bg-background">
      {/* Device Type Selector */}
      {onDeviceTypeChange && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => onDeviceTypeChange('mobile')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              deviceType === 'mobile'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Mobile
          </button>
          <button
            type="button"
            onClick={() => onDeviceTypeChange('web')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              deviceType === 'web'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Web
          </button>
        </div>
      )}

      <InputGroup
        className={cn(
          "min-h-[172px] rounded-3xl bg-background ",
          className && className
        )}
      >
        <InputGroupTextarea
          className="text-base! py-2.5!"
          placeholder="I want to design an app that..."
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value);
          }}
        />

        <InputGroupAddon
          align="block-end"
          className="flex items-center justify-end"
        >
          {!hideSubmitBtn && (
            <InputGroupButton
              variant="default"
              className=""
              size="sm"
              disabled={!promptText?.trim() || isLoading}
              onClick={() => onSubmit?.()}
            >
              {isLoading ? (
                <Spinner />
              ) : (
                <>
                  Design
                  <CornerDownLeftIcon className="size-4" />
                </>
              )}
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};

export default PromptInput;
