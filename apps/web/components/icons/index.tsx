

import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  width?: number | string; 
  height?: number | string;
  props? : any;
}

export const AvailableIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none" {...props}    >
        <g clipPath="url(#clip0_4418_7972)">
            <path d="M22 8.34032V15.6603C22 17.1603 20.37 18.1003 19.07 17.3503L15.9 15.5203L12.73 13.6903L12.24 13.4103V10.5903L12.73 10.3103L15.9 8.48032L19.07 6.65032C20.37 5.90032 22 6.84032 22 8.34032Z" fill="white" style={{ fill: 'var(--fillg)' }} />
            <path d="M12.2399 8.34032V15.6603C12.2399 17.1603 10.6099 18.1003 9.31994 17.3503L6.13994 15.5203L2.96994 13.6903C1.67994 12.9403 1.67994 11.0603 2.96994 10.3103L6.13994 8.48032L9.31994 6.65032C10.6099 5.90032 12.2399 6.84032 12.2399 8.34032Z" fill="white" style={{ fill: 'var(--fillg)' }} />
        </g>
        <defs>
            <clipPath id="clip0_4418_7972">
                <rect width="24" height="24" fill="white" />
            </clipPath>
        </defs>
    </svg>
);

export const BackwardIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none" {...props}    >
        <g clipPath="url(#clip0_4418_7972)">
            <path d="M22 8.34032V15.6603C22 17.1603 20.37 18.1003 19.07 17.3503L15.9 15.5203L12.73 13.6903L12.24 13.4103V10.5903L12.73 10.3103L15.9 8.48032L19.07 6.65032C20.37 5.90032 22 6.84032 22 8.34032Z" fill="white" style={{ fill: 'var(--fillg)' }} />
            <path d="M12.2399 8.34032V15.6603C12.2399 17.1603 10.6099 18.1003 9.31994 17.3503L6.13994 15.5203L2.96994 13.6903C1.67994 12.9403 1.67994 11.0603 2.96994 10.3103L6.13994 8.48032L9.31994 6.65032C10.6099 5.90032 12.2399 6.84032 12.2399 8.34032Z" fill="white" style={{ fill: 'var(--fillg)' }} />
        </g>
        <defs>
            <clipPath id="clip0_4418_7972">
                <rect width="24" height="24" fill="white" />
            </clipPath>
        </defs>
    </svg>
);


export const BackTenSecondIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <g clipPath="url(#clip0_4418_6812)">
            <path d="M9.54004 16.6701C9.13004 16.6701 8.79004 16.3301 8.79004 15.9201V12.5301L8.60003 12.7401C8.32003 13.0501 7.85004 13.0701 7.54004 12.8001C7.23004 12.5201 7.21004 12.0501 7.48004 11.7401L8.98004 10.0701C9.19004 9.84008 9.52003 9.76007 9.81003 9.87007C10.1 9.98007 10.29 10.2601 10.29 10.5701V15.9201C10.29 16.3401 9.96004 16.6701 9.54004 16.6701Z" fill="white"/>
            <path stroke="#fff" d="M10.02 5.22042C9.84997 5.22042 9.68997 5.17044 9.54997 5.05044C9.22997 4.79044 9.17998 4.32045 9.42998 4.00045L11.41 1.53048C11.67 1.21048 12.14 1.16042 12.46 1.41042C12.78 1.66042 12.83 2.14047 12.58 2.46047L10.6 4.93044C10.46 5.12044 10.24 5.22042 10.02 5.22042Z" fill="white"/>
            <path d="M11.9999 22.7498C6.68988 22.7498 2.35986 18.4297 2.35986 13.1097C2.35986 11.0397 3.02988 9.04973 4.30988 7.34973C4.55988 7.01973 5.02986 6.94977 5.35986 7.19977C5.68986 7.44977 5.75989 7.91976 5.50989 8.24976C4.42989 9.68976 3.85986 11.3697 3.85986 13.1097C3.85986 17.5997 7.50988 21.2498 11.9999 21.2498C16.4899 21.2498 20.1399 17.5997 20.1399 13.1097C20.1399 8.61974 16.4899 4.96973 11.9999 4.96973C11.4199 4.96973 10.8299 5.03976 10.1899 5.18976C9.78988 5.27976 9.37989 5.02976 9.28989 4.62976C9.19989 4.22976 9.44988 3.81974 9.84988 3.72974C10.5999 3.55974 11.3099 3.46973 11.9999 3.46973C17.3099 3.46973 21.6399 7.78974 21.6399 13.1097C21.6399 18.4297 17.3099 22.7498 11.9999 22.7498Z" fill="white"/>
            <path d="M14 16.6703C12.48 16.6703 11.25 15.4403 11.25 13.9203V12.5703C11.25 11.0503 12.48 9.82031 14 9.82031C15.52 9.82031 16.75 11.0503 16.75 12.5703V13.9203C16.75 15.4403 15.52 16.6703 14 16.6703ZM14 11.3303C13.31 11.3303 12.75 11.8903 12.75 12.5803V13.9303C12.75 14.6203 13.31 15.1803 14 15.1803C14.69 15.1803 15.25 14.6203 15.25 13.9303V12.5803C15.25 11.8903 14.69 11.3303 14 11.3303Z" fill="white"/>
        </g>
        <defs>
            <clipPath id="clip0_4418_6812">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);
export const ForwardIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fff">
        <g clipPath="url(#clip0_4418_7973)">
            <path d="M2 8.34032V15.6603C2 17.1603 3.63 18.1003 4.93 17.3503L8.1 15.5203L11.27 13.6903L11.76 13.4103V10.5903L11.27 10.3103L8.1 8.48032L4.93 6.65032C3.63 5.90032 2 6.84032 2 8.34032Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
            <path d="M11.76 8.34032V15.6603C11.76 17.1603 13.39 18.1003 14.68 17.3503L17.86 15.5203L21.03 13.6903C22.32 12.9403 22.32 11.0603 21.03 10.3103L17.86 8.48032L14.68 6.65032C13.39 5.90032 11.76 6.84032 11.76 8.34032Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
        </g>
        <defs>
            <clipPath id="clip0_4418_7973">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);

export const ForwardTenSecondIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_9215)">
<path d="M13.98 4.46997L12 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M19.09 7.79974C20.2 9.27974 20.89 11.1097 20.89 13.1097C20.89 18.0197 16.91 21.9998 12 21.9998C7.09 21.9998 3.10999 18.0197 3.10999 13.1097C3.10999 8.19974 7.09 4.21973 12 4.21973C12.68 4.21973 13.34 4.30978 13.98 4.45978" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M9.54004 15.92V10.5801L8.04004 12.2501" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M14 10.5801C15.1 10.5801 16 11.4801 16 12.5801V13.9301C16 15.0301 15.1 15.9301 14 15.9301C12.9 15.9301 12 15.0301 12 13.9301V12.5801C12 11.4701 12.9 10.5801 14 10.5801Z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_9215">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>

)


export const LessVolumeIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fff">
        <g clipPath="url(#clip0_4418_6757)">
            <path d="M13.8801 20.5896C13.0901 20.5896 12.2201 20.3096 11.3501 19.7596L8.43008 17.9296C8.23008 17.8096 8.00008 17.7396 7.77008 17.7396H6.33008C3.91008 17.7396 2.58008 16.4096 2.58008 13.9896V9.98962C2.58008 7.56962 3.91008 6.23962 6.33008 6.23962H7.76008C7.99008 6.23962 8.22008 6.16962 8.42008 6.04962L11.3401 4.21962C12.8001 3.30962 14.2201 3.13962 15.3401 3.75962C16.4601 4.37962 17.0701 5.66962 17.0701 7.39962V16.5696C17.0701 18.2896 16.4501 19.5896 15.3401 20.2096C14.9001 20.4696 14.4101 20.5896 13.8801 20.5896ZM6.33008 7.74962C4.75008 7.74962 4.08008 8.41962 4.08008 9.99962V13.9996C4.08008 15.5796 4.75008 16.2496 6.33008 16.2496H7.76008C8.28008 16.2496 8.78008 16.3896 9.22008 16.6696L12.1401 18.4996C13.1101 19.0996 14.0101 19.2596 14.6201 18.9196C15.2301 18.5796 15.5801 17.7296 15.5801 16.5996V7.40962C15.5801 6.26962 15.2301 5.41962 14.6201 5.08962C14.0101 4.74962 13.1101 4.89962 12.1401 5.50962L9.22008 7.32962C8.78008 7.60962 8.28008 7.74962 7.76008 7.74962H6.33008Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
            <path d="M19.3301 16.7503C19.1701 16.7503 19.0201 16.7003 18.8801 16.6003C18.5501 16.3503 18.4801 15.8803 18.7301 15.5503C20.3001 13.4603 20.3001 10.5403 18.7301 8.45027C18.4801 8.12027 18.5501 7.65027 18.8801 7.40027C19.2101 7.15027 19.6801 7.22027 19.9301 7.55027C21.9001 10.1703 21.9001 13.8303 19.9301 16.4503C19.7901 16.6503 19.5601 16.7503 19.3301 16.7503Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
        </g>
        <defs>
            <clipPath id="clip0_4418_6757">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);

export const MoreVolumeIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_9270)">
<path d="M2 9.99979V13.9998C2 15.9998 3 16.9998 5 16.9998H6.43C6.8 16.9998 7.17 17.1098 7.49 17.2998L10.41 19.1298C12.93 20.7098 15 19.5598 15 16.5898V7.40979C15 4.42979 12.93 3.28979 10.41 4.86979L7.49 6.69979C7.17 6.88979 6.8 6.99979 6.43 6.99979H5C3 6.99979 2 7.99979 2 9.99979Z" stroke="#fff" strokeWidth="1.5" />
<path d="M18 8C19.78 10.37 19.78 13.63 18 16" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M19.83 5.5C22.72 9.35 22.72 14.65 19.83 18.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_9270">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);


export const MuteIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_9266)">
<path d="M15 8.36979V7.40979C15 4.42979 12.93 3.28979 10.41 4.86979L7.49 6.69979C7.17 6.88979 6.8 6.99979 6.43 6.99979H5C3 6.99979 2 7.99979 2 9.99979V13.9998C2 15.9998 3 16.9998 5 16.9998H7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M10.41 19.1302C12.93 20.7102 15 19.5602 15 16.5902V12.9502" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M18.81 9.41992C19.71 11.5699 19.44 14.0799 18 15.9999" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M21.15 7.7998C22.62 11.2898 22.18 15.3698 19.83 18.4998" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M22 2L2 22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_9266">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);


export const VoiceSquareIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fff">
        <g clipPath="url(#clip0_4418_8007)">
            <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM6.75 14.14C6.75 14.55 6.41 14.89 6 14.89C5.59 14.89 5.25 14.55 5.25 14.14V9.86C5.25 9.45 5.59 9.11 6 9.11C6.41 9.11 6.75 9.45 6.75 9.86V14.14ZM9.75 15.57C9.75 15.98 9.41 16.32 9 16.32C8.59 16.32 8.25 15.98 8.25 15.57V8.43C8.25 8.02 8.59 7.68 9 7.68C9.41 7.68 9.75 8.02 9.75 8.43V15.57ZM12.75 17C12.75 17.41 12.41 17.75 12 17.75C11.59 17.75 11.25 17.41 11.25 17V7C11.25 6.59 11.59 6.25 12 6.25C12.41 6.25 12.75 6.59 12.75 7V17ZM15.75 15.57C15.75 15.98 15.41 16.32 15 16.32C14.59 16.32 14.25 15.98 14.25 15.57V8.43C14.25 8.02 14.59 7.68 15 7.68C15.41 7.68 15.75 8.02 15.75 8.43V15.57ZM18.75 14.14C18.75 14.55 18.41 14.89 18 14.89C17.59 14.89 17.25 14.55 17.25 14.14V9.86C17.25 9.45 17.59 9.11 18 9.11C18.41 9.11 18.75 9.45 18.75 9.86V14.14Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
        </g>
        <defs>
            <clipPath id="clip0_4418_8007">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);


export const PreviousIcon : React.FC<IconProps> = ({ width , height,  ...props }) => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_3099)">
<path d="M12.2702 7.38982L16.4202 4.99981C18.1202 4.01981 20.2502 5.2398 20.2502 7.2098V16.7798C20.2502 18.7398 18.1202 19.9698 16.4202 18.9898L12.2702 16.5998L8.12021 14.1998C6.42021 13.2198 6.42021 10.7698 8.12021 9.78981" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M3.75977 18.18V17" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M3.75977 14.0003V5.82031" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_3099">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);

export const NextIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_3100)">
<path d="M11.73 7.38982L7.57999 4.99981C5.87999 4.01981 3.75 5.2398 3.75 7.2098V16.7798C3.75 18.7398 5.87999 19.9698 7.57999 18.9898L11.73 16.5998L15.88 14.1998C17.58 13.2198 17.58 10.7698 15.88 9.78981" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M20.2402 18.18V17" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M20.2402 14.0003V5.82031" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_3100">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);

export const PlayIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_3157)">
<path d="M17.13 7.98038C20.96 10.1904 20.96 13.8104 17.13 16.0204L14.04 17.8004L10.95 19.5804C7.13 21.7904 4 19.9804 4 15.5604V12.0004V8.44038C4 4.02038 7.13 2.21038 10.96 4.42038L13.21 5.72038" stroke="#fff" strokeWidth="1.5" stroke-miterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_3157">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);

export const PauseIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_3131)">
<path d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M10.75 14.4302V9.3702C10.75 8.8902 10.55 8.7002 10.04 8.7002H8.75004C8.24004 8.7002 8.04004 8.8902 8.04004 9.3702V14.4302C8.04004 14.9102 8.24004 15.1002 8.75004 15.1002H10.04C10.55 15.1002 10.75 14.9102 10.75 14.4302Z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M16.0298 14.4302V9.3702C16.0298 8.8902 15.8298 8.7002 15.3198 8.7002H14.0298C13.5198 8.7002 13.3198 8.8902 13.3198 9.3702V14.4302C13.3198 14.9102 13.5198 15.1002 14.0298 15.1002" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_3131">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);


export const PlayListIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#fff">
        <g clipPath="url(#clip0_4418_7994)">
            <path d="M18 5.25H6C5.59 5.25 5.25 4.91 5.25 4.5C5.25 4.09 5.59 3.75 6 3.75H18C18.41 3.75 18.75 4.09 18.75 4.5C18.75 4.91 18.41 5.25 18 5.25Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
            <path d="M15 2.75H9C8.59 2.75 8.25 2.41 8.25 2C8.25 1.59 8.59 1.25 9 1.25H15C15.41 1.25 15.75 1.59 15.75 2C15.75 2.41 15.41 2.75 15 2.75Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
            <path d="M13.91 16.21C13.57 16.21 13.29 16.49 13.29 16.83C13.29 17.17 13.57 17.45 13.91 17.45C14.25 17.45 14.53 17.17 14.53 16.83C14.53 16.49 14.25 16.21 13.91 16.21Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
            <path d="M9.51002 17.7399C9.51002 17.3999 9.23002 17.1299 8.89002 17.1299C8.55002 17.1299 8.27002 17.4099 8.27002 17.7499C8.27002 18.0899 8.55002 18.3699 8.89002 18.3699C9.23002 18.3599 9.51002 18.0799 9.51002 17.7399Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
            <path d="M18 7H6C3.8 7 2 8.8 2 11V18C2 20.2 3.8 22 6 22H18C20.2 22 22 20.2 22 18V11C22 8.8 20.2 7 18 7ZM16.03 12.46V16.83C16.03 16.85 16.02 16.86 16.02 16.88C15.99 18.02 15.06 18.95 13.91 18.95C12.74 18.95 11.79 18 11.79 16.83C11.79 15.66 12.74 14.71 13.91 14.71C14.13 14.71 14.33 14.75 14.53 14.81V13.44L11.01 14.4V17.73V17.74C11.01 18.91 10.06 19.86 8.89 19.86C7.72 19.86 6.77 18.91 6.77 17.74C6.77 16.57 7.72 15.62 8.89 15.62C9.11 15.62 9.31 15.66 9.51 15.72V13.82V12.22C9.51 11.33 10.06 10.61 10.91 10.39L13.64 9.64C14.52 9.41 15.06 9.64 15.37 9.88C15.67 10.11 16.03 10.58 16.03 11.47V12.46Z" fill="white" style={{ fill: 'var(--fillg)' }}/>
        </g>
        <defs>
            <clipPath id="clip0_4418_7994">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);


export const UsersIcon : React.FC<IconProps> = ({ width , height,  ...props }) => (
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_3111_32656)">
<path d="M12.68 3.96C13.16 4.67 13.44 5.52 13.44 6.44C13.43 8.84 11.54 10.79 9.16 10.87C9.06 10.86 8.94 10.86 8.83 10.87C6.45 10.79 4.56 8.84 4.56 6.44C4.56 3.99 6.54 2 9 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M16.41 4C18.35 4 19.91 5.57 19.91 7.5C19.91 9.39 18.41 10.93 16.54 11C16.46 10.99 16.37 10.99 16.28 11" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M4.16 14.56C1.74 16.18 1.74 18.82 4.16 20.43C6.91 22.27 11.42 22.27 14.17 20.43C16.59 18.81 16.59 16.17 14.17 14.56C11.43 12.73 6.92 12.73 4.16 14.56Z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M18.34 20C19.06 19.85 19.74 19.56 20.3 19.13C21.86 17.96 21.86 16.03 20.3 14.86C19.75 14.44 19.08 14.16 18.37 14" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_3111_32656">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);


export const ProfileIcon : React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_3111_32652)">
<path d="M14.94 8.04047C15.16 8.48047 15.29 8.98047 15.29 9.51047C15.28 11.2805 13.89 12.7305 12.13 12.7805C12.06 12.7705 11.97 12.7705 11.89 12.7805C10.13 12.7205 8.73 11.2805 8.73 9.51047C8.73 7.70047 10.19 6.23047 12.01 6.23047" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M18.74 19.3796C16.96 21.0096 14.6 21.9996 12 21.9996C9.4 21.9996 7.04 21.0096 5.26 19.3796C5.36 18.4396 5.96 17.5196 7.03 16.7996C9.77 14.9796 14.25 14.9796 16.97 16.7996C18.04 17.5196 18.64 18.4396 18.74 19.3796Z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_3111_32652">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);


export const TimeIcon : React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<g clip-path="url(#clip0_4418_3876)">
<path d="M15.7099 15.1798L12.6099 13.3298C12.0699 13.0098 11.6299 12.2398 11.6299 11.6098V7.50977" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M4 6C2.75 7.67 2 9.75 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C10.57 2 9.2 2.3 7.97 2.85" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</g>
<defs>
<clipPath id="clip0_4418_3876">
<rect width="24" height="24" fill="white"/>
</clipPath>
</defs>
</svg>
);

export const SearchIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
<path d="M11.5 2C16.75 2 21 6.25 21 11.5C21 16.75 16.75 21 11.5 21C6.25 21 2 16.75 2 11.5C2 7.8 4.11 4.6 7.2 3.03" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M22 22L20 20" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
</svg>
);


export const DeleteIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <g clipPath="url(#clip0_4418_3704)">
            <path d="M21 5.98047C17.67 5.65047 14.32 5.48047 10.98 5.48047C9 5.48047 7.02 5.58047 5.04 5.78047L3 5.98047" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.5 4.97L8.72 3.66C8.88 2.71 9 2 10.69 2H13.31C15 2 15.13 2.75 15.28 3.67L15.5 4.97" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15.2099 22.0006H8.7899C5.9999 22.0006 5.9099 20.7806 5.7999 19.2106L5.1499 9.14062" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.8502 9.14062L18.2002 19.2106" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.3301 16.5H13.6601" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12.8198 12.5H14.4998" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.5 12.5H10.33" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
            <clipPath id="clip0_4418_3704">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);

export const ChatIcon: React.FC<IconProps> = ({ width , height,  ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <g clipPath="url(#clip0_4418_3292)">
            <path d="M9.5 2C12.52 2 15.13 3.67001 16.3 6.07001C16.75 6.96001 17 7.95 17 9C17 12.87 13.64 16 9.5 16L8.57001 17.12L8.02 17.78C7.55 18.34 6.65 18.22 6.34 17.55L5 14.6C3.18 13.32 2 11.29 2 9C2 6.73 3.15 4.72 4.95 3.44" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21.9998 12.8603C21.9998 15.1503 20.8198 17.1803 18.9998 18.4603L17.6598 21.4103C17.3498 22.0803 16.4498 22.2103 15.9798 21.6403L14.4998 19.8603C12.0798 19.8603 9.91982 18.7903 8.56982 17.1203L9.49982 16.0003C13.6398 16.0003 16.9998 12.8703 16.9998 9.00031C16.9998 7.95031 16.7498 6.96031 16.2998 6.07031C17.9298 6.44031 19.3398 7.31031 20.3598 8.50031" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 9H12" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
            <clipPath id="clip0_4418_3292">
                <rect width="24" height="24" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);