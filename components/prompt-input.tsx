"use client";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  type?: string;
}
const PromptInput = ({
  promptText,
  setPromptText,
  isLoading,
  className,
  hideSubmitBtn = false,
  onSubmit,
  type = 'mobile'
}: PropsType) => {
  return (
    <div className="bg-background">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton className="!pr-1.5 text-xs">
                Type <ChevronDownIcon className="size-3" />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="[--radius:0.95rem]">
              <DropdownMenuItem>Web</DropdownMenuItem>
              <DropdownMenuItem>Mobile</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
